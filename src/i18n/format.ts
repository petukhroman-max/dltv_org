import type { Locale } from "@/i18n/config";

const localeTags: Record<Locale, string> = { en: "en-US", ru: "ru-RU" };

export function formatDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatDateTime(
  value: string | Date,
  locale: Locale,
  timeZone = "UTC",
): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}
