import type { PublishedTournament } from "@/lib/public-tournaments/public-tournaments.types";

export function formatPublicDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function formatPublicDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
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

export function publicDescription(tournament: PublishedTournament): string {
  const description = tournament.description?.trim();
  return description
    ? description.slice(0, 155)
    : `${tournament.tournament_name}, a Deadlock tournament organized by ${tournament.organizer_name}.`;
}
