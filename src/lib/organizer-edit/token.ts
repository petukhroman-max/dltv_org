import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { organizerEditTokenSchema } from "@/lib/organizer-edit/organizer-edit.schema";

export const EDIT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

export function generateEditToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashEditToken(token: string): string {
  const parsed = organizerEditTokenSchema.parse(token);
  return createHash("sha256").update(parsed, "utf8").digest("hex");
}
