import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("public navigation route scope", () => {
  it.each(["admin", "auth", "edit-submission"])(
    "does not mount the public header in /%s routes",
    (route) => {
      const directory = join(process.cwd(), "src", "app", route);
      const source = sourceFiles(directory)
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");

      expect(source).not.toContain("PublicHeader");
    },
  );
});
