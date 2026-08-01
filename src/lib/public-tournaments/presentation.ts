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
  timeZone = "UTC",
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(localeTags[locale], {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(localeTags[locale], {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date);
  }
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

export function publicDescription(
  tournament: {
    description: string | null;
    tournament_name: string;
    organizer_name: string;
  },
  locale: Locale = "en",
): string {
  const description = tournament.description?.trim();
  return description
    ? description.slice(0, 155)
    : locale === "ru"
      ? `${tournament.tournament_name} — турнир по Deadlock от организатора ${tournament.organizer_name}.`
      : `${tournament.tournament_name}, a Deadlock tournament organized by ${tournament.organizer_name}.`;
}
