import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8").replaceAll(
    "\r\n",
    "\n",
  );
}

const workspaceActions = source("src/app/workspace/[token]/actions.ts");
const adminActions = source(
  "src/app/admin/(protected)/submissions/[id]/operational-actions.ts",
);
const workspacePage = source("src/app/workspace/[token]/page.tsx");
const adminPage = source("src/app/admin/(protected)/submissions/[id]/page.tsx");

describe("operational access regression contract", () => {
  it("derives workspace authority only from validated token access", () => {
    expect(workspaceActions).toContain(
      "const access = await validateWorkspaceAccess(rawToken)",
    );
    expect(workspaceActions).toContain("submissionId: access.submission.id");
    expect(workspaceActions).toContain("tokenId: access.tokenId");
    expect(workspaceActions).not.toMatch(
      /formData\.get\(["']submission(_id)?["']\)/,
    );
  });

  it("derives admin actor context from requireAdmin and route submission ID", () => {
    expect(adminActions).toContain("const identity = await requireAdmin()");
    expect(adminActions).toContain('{ kind: "admin", identity }');
    expect(adminActions).not.toMatch(
      /formData\.get\(["']submission(_id)?["']\)/,
    );
  });

  it("keeps locale presentation separate from operational submission identity", () => {
    expect(workspacePage).toContain("submissionId: access.submission.id");
    expect(workspacePage).toContain("locale={locale}");
    expect(adminPage).toContain("const { id } = await params");
    expect(adminPage).toContain("locale={locale}");
    expect(workspaceActions).not.toContain("published_tournaments");
    expect(adminActions).not.toContain("published_tournaments");
  });
});
