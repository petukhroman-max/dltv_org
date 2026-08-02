import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Public API OpenAPI contract", () => {
  it("publishes valid JSON without internal schemas", () => {
    const document = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "public/openapi-v1.json"),
        "utf8",
      ),
    );
    expect(document.openapi).toBe("3.1.0");
    expect(Object.keys(document.paths)).toHaveLength(8);
    expect(document.components.securitySchemes.bearerApiKey.scheme).toBe(
      "bearer",
    );
    const serialized = JSON.stringify(document);
    for (const forbidden of [
      "submission_id",
      "real_name",
      "steam_id",
      "deadlock_account_id",
      "workspace_token",
      "api_keys",
    ])
      expect(serialized).not.toContain(forbidden);
  });
});
