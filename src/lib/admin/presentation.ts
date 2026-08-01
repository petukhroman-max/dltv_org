import type { Json } from "@/lib/supabase/database.types";
import type { Locale } from "@/i18n/config";

const localeTags: Record<Locale, string> = { en: "en-US", ru: "ru-RU" };

const sensitiveMetadataKey =
  /(?:authorization|cookie|credential|password|refresh|secret|service.?role|token|api.?key)/i;

export function formatAdminDate(
  value: string | null,
  locale: Locale = "en",
): string {
  if (!value) {
    return "—";
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function formatAdminDateTime(
  value: string | null,
  locale: Locale = "en",
): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function getSafeExternalUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function sanitizeEventMetadata(value: Json): Json {
  if (Array.isArray(value)) {
    return value.map(sanitizeEventMetadata);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        sensitiveMetadataKey.test(key)
          ? "[redacted]"
          : child === undefined
            ? null
            : sanitizeEventMetadata(child),
      ]),
    );
  }
  return value;
}
