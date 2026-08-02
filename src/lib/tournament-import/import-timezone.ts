import { z } from "zod";

import type { TournamentImportBundle } from "./import-model";

export const timezoneFallbackWarning =
  "timezone_fallback_confirmation_required";

function isSupportedTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const importTimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_+./-]+$/)
  .refine(isSupportedTimezone, "Unsupported timezone");

export function defaultImportTimezone(value: string | null | undefined) {
  const parsed = importTimezoneSchema.safeParse(value);
  return parsed.success ? parsed.data : "UTC";
}

export function prepareImportTimezoneConfirmation(
  bundle: TournamentImportBundle,
  preferredTimezone: string | null | undefined,
): TournamentImportBundle {
  const fallbackTimezone = defaultImportTimezone(preferredTimezone);
  return {
    ...bundle,
    fallbackTimezone,
    entities: bundle.entities.map((entity) => {
      if (
        (entity.entityType !== "stage" && entity.entityType !== "match") ||
        entity.data.timezone !== null
      ) {
        return entity;
      }
      return {
        ...entity,
        warnings: entity.warnings.includes(timezoneFallbackWarning)
          ? entity.warnings
          : [...entity.warnings, timezoneFallbackWarning],
      };
    }),
  };
}

export function importNeedsTimezoneConfirmation(
  bundle: TournamentImportBundle,
) {
  return bundle.entities.some(
    (entity) =>
      (entity.entityType === "stage" || entity.entityType === "match") &&
      entity.data.timezone === null,
  );
}
