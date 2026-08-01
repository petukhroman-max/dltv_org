import { z } from "zod";

export const operationalUuidSchema = z.string().uuid();
export const operationalSourceSchema = z.enum(["manual", "import", "api"]);
export const scopedSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const offsetDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value), {
    message: "Date and time must include a timezone offset.",
  });

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid IANA timezone." },
  );

export const positiveOddIntegerSchema = z
  .number()
  .int()
  .positive()
  .refine((value) => value % 2 === 1, {
    message: "Value must be an odd integer.",
  });

export function nullableTrimmedString(maxLength: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().min(1).max(maxLength).nullable().optional(),
  );
}

export const nullableOffsetDateTimeSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  offsetDateTimeSchema.nullable().optional(),
);

export const nullableHttpUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .url()
    .refine(
      (value) => {
        try {
          return ["http:", "https:"].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      },
      { message: "Only http and https URLs are allowed." },
    )
    .nullable()
    .optional(),
);
