export function slugifyTournamentName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    .replace(/-$/g, "");
  return slug || "tournament";
}

export function resolveTournamentSlug({
  title,
  existingSlug,
  hasConflict,
  stableSuffix,
}: {
  title: string;
  existingSlug?: string | null;
  hasConflict: boolean;
  stableSuffix: string;
}): string {
  if (existingSlug) return existingSlug;
  const base = slugifyTournamentName(title);
  if (!hasConflict) return base;
  const suffix = stableSuffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  return `${base.slice(0, 87).replace(/-$/g, "")}-${suffix || "tournament"}`.slice(
    0,
    100,
  );
}
