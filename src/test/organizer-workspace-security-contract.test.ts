import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("organizer workspace route and UI security", () => {
  const page = source("src/app/workspace/[token]/page.tsx");
  const workspaceActions = source("src/app/workspace/[token]/actions.ts");
  const adminActions = source(
    "src/app/admin/(protected)/submissions/[id]/operational-actions.ts",
  );
  const workspaceLinkActions = source(
    "src/app/admin/(protected)/submissions/[id]/workspace-link-actions.ts",
  );
  const form = source("src/components/operational/stages-teams-workspace.tsx");
  const rosterForm = source("src/components/operational/roster-workspace.tsx");
  const middleware = source("src/middleware.ts");

  it("uses a dynamic no-store, noindex workspace with generic invalid state", () => {
    expect(page).toContain('dynamic = "force-dynamic"');
    expect(page).toContain("noStore()");
    expect(page).toContain(
      "This workspace link is invalid or no longer available.",
    );
    const layout = source("src/app/workspace/layout.tsx");
    expect(layout).toContain("index: false");
    expect(layout).toContain("follow: false");
  });

  it("sets private response headers for every workspace route", () => {
    expect(middleware).toContain('startsWith("/workspace")');
    expect(middleware).toContain("private, no-store, no-cache");
    expect(middleware).toContain("noindex, nofollow, noarchive");
    expect(middleware).toContain("Referrer-Policy");
    expect(middleware).toContain("no-referrer");
  });

  it("does not render or store the raw token in the client workspace component", () => {
    expect(form).not.toContain("rawToken");
    expect(form).not.toContain('name="token"');
    expect(page).not.toMatch(/<code>\s*\{token\}/);
    expect(page).not.toMatch(/>\s*\{token\}\s*</);
    expect(rosterForm).not.toContain("rawToken");
    expect(rosterForm).not.toContain('name="token"');
  });

  it("revalidates workspace access in actions and requires admin in admin actions", () => {
    expect(workspaceActions).toContain("validateWorkspaceAccess(rawToken)");
    expect(adminActions).toContain("await requireAdmin()");
    expect(workspaceLinkActions.match(/await requireAdmin\(\)/g)).toHaveLength(
      2,
    );
    expect(form).not.toContain('name="actor_type"');
    expect(form).not.toContain('name="actor_id"');
    expect(form).not.toContain('name="event_type"');
    expect(form).not.toContain('name="slug"');
    expect(form).not.toContain('name="source"');
    expect(rosterForm).not.toContain('name="submission_id"');
    expect(rosterForm).not.toContain('name="actor_type"');
    expect(rosterForm).not.toContain('name="actor_id"');
    expect(rosterForm).not.toContain('name="event_type"');
    expect(rosterForm).not.toContain('name="metadata"');
  });

  it("mounts the shared stage and team CRUD in admin", () => {
    const adminPage = source(
      "src/app/admin/(protected)/submissions/[id]/page.tsx",
    );
    expect(adminPage).toContain("<StagesTeamsWorkspace");
    expect(adminPage).toContain("<AdminWorkspaceLinkPanel");
    expect(adminPage).toContain("<RosterWorkspace");
  });

  it("contains required empty, pending, conflict and dependency copy", () => {
    const runner = source(
      "src/lib/operational-workspace/operational-action-runner.ts",
    );
    for (const label of [
      "Saving stage…",
      "Deleting stage…",
      "Saving team…",
      "Deleting team…",
      "No stages added.",
      "No teams added.",
    ]) {
      expect(form).toContain(label);
    }
    expect(runner).toContain("This item was updated elsewhere");
    expect(runner).toContain("This stage cannot be deleted");
    expect(runner).toContain("This team cannot be deleted");
  });

  it("keeps public catalog source isolated from operational workspace data", () => {
    const publicPages = [
      source("src/app/tournaments/page.tsx"),
      source("src/app/tournaments/[slug]/page.tsx"),
    ].join("\n");
    expect(publicPages).not.toContain("tournament_stages");
    expect(publicPages).not.toContain("tournament_teams");
    expect(publicPages).not.toContain("organizer_workspace_tokens");
    expect(publicPages).not.toContain("tournament_roster_members");
    expect(publicPages).not.toContain("players");
  });
});
