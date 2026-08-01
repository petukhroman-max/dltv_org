const FALLBACK_SLUG = "item";

export function createScopedSlug(value: string, fallback = FALLBACK_SLUG) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized) return normalized.slice(0, 100).replace(/-$/g, "");

  const safeFallback = fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return safeFallback.slice(0, 100).replace(/-$/g, "") || FALLBACK_SLUG;
}

export function appendScopedSlugSuffix(slug: string, suffix: number) {
  if (!Number.isInteger(suffix) || suffix < 2) return slug;
  const suffixText = `-${suffix}`;
  return `${slug.slice(0, 100 - suffixText.length).replace(/-$/g, "")}${suffixText}`;
}

export function resolveScopedSlug({
  name,
  existingSlug,
  regenerate = false,
}: {
  name: string;
  existingSlug?: string;
  regenerate?: boolean;
}) {
  return existingSlug && !regenerate ? existingSlug : createScopedSlug(name);
}
