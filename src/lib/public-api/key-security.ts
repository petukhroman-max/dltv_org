import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const API_KEY_PATTERN = /^dltv_(live|test)_[A-Za-z0-9_-]{43}$/;

export function generateApiKey(
  environment: "live" | "test" = process.env.NODE_ENV === "production"
    ? "live"
    : "test",
) {
  const secret = randomBytes(32).toString("base64url");
  const rawKey = `dltv_${environment}_${secret}`;
  return { rawKey, prefix: rawKey.slice(0, 20) };
}

export function isApiKeyFormat(value: string) {
  return API_KEY_PATTERN.test(value);
}

export function hashApiKey(rawKey: string, pepper: string) {
  if (pepper.length < 32) {
    throw new Error("API key pepper must contain at least 32 characters");
  }
  return createHmac("sha256", pepper).update(rawKey, "utf8").digest("hex");
}

export function apiKeyHashesEqual(left: string, right: string) {
  if (!/^[0-9a-f]{64}$/.test(left) || !/^[0-9a-f]{64}$/.test(right)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function requireApiKeyPepper() {
  const pepper = process.env.API_KEY_PEPPER;
  if (!pepper) throw new Error("API_KEY_PEPPER is not configured");
  return pepper;
}
