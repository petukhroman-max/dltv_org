import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("roster privacy and authority contract", () => {
  it("keeps real_name out of roster schemas, service, repository, actions and UI", () => {
    for (const path of [
      "src/lib/domain/roster-management.ts",
      "src/lib/operational-workspace/roster.repository.ts",
      "src/lib/operational-workspace/roster.service.ts",
      "src/lib/operational-workspace/roster-action-runner.ts",
      "src/components/operational/roster-workspace.tsx",
    ]) {
      expect(read(path)).not.toContain("real_name");
    }
  });

  it("does not accept browser-controlled submission, actor or audit authority", () => {
    const runner = read(
      "src/lib/operational-workspace/roster-action-runner.ts",
    );
    expect(runner).not.toMatch(
      /text\(formData, "(submission_id|actor_type|actor_id|event_type|metadata)"\)/,
    );
    expect(runner).not.toContain("left_at: text(formData");
  });
});
