import { z } from "zod";

export const workspaceTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid workspace token format.");

export const workspaceTokenExpirationDays = [7, 30, 90] as const;
export const workspaceTokenExpirationDaysSchema = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
);
