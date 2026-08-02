import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { requireApiKeyPepper } from "@/lib/public-api/key-security";

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`cursor:v1:${payload}`, "utf8")
    .digest()
    .subarray(0, 16);
}

export function createApiCursor(
  scope: string,
  value: string,
  secret = requireApiKeyPepper(),
) {
  const payload = Buffer.from(
    JSON.stringify({ scope, value }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}

export function parseApiCursor(
  cursor: string,
  expectedScope: string,
  secret = requireApiKeyPepper(),
) {
  try {
    const [payload, encodedSignature, extra] = cursor.split(".");
    if (!payload || !encodedSignature || extra) return null;
    const provided = Buffer.from(encodedSignature, "base64url");
    const expected = signature(payload, secret);
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    )
      return null;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { scope?: unknown; value?: unknown };
    return decoded.scope === expectedScope &&
      typeof decoded.value === "string" &&
      decoded.value.length <= 120
      ? decoded.value
      : null;
  } catch {
    return null;
  }
}
