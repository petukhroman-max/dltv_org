import type { Locale } from "@/i18n/config";

const localeTags: Record<Locale, string> = { en: "en-US", ru: "ru-RU" };

export function formatPublicDate(value: string, locale: Locale = "en"): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function formatPublicDateTime(
  value: string,
  locale: Locale = "en",
): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function safePublicUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function publicDescription(tournament: {
  description: string | null;
  tournament_name: string;
  organizer_name: string;
}): string {
  const description = tournament.description?.trim();
  return description
    ? description.slice(0, 155)
    : `${tournament.tournament_name}, a Deadlock tournament organized by ${tournament.organizer_name}.`;
}
