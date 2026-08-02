import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const organizer = fs.readFileSync(
  path.join(process.cwd(), "src/app/workspace/[token]/import/actions.ts"),
  "utf8",
);
const admin = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/admin/(protected)/submissions/[id]/import/actions.ts",
  ),
  "utf8",
);
const service = fs.readFileSync(
  path.join(process.cwd(), "src/lib/tournament-import/import.service.ts"),
  "utf8",
);
const workspace = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/components/operational/tournament-import-workspace.tsx",
  ),
  "utf8",
);
const resolutionForm = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/components/operational/import-conflict-resolution-form.tsx",
  ),
  "utf8",
);
const copy = fs.readFileSync(
  path.join(process.cwd(), "src/lib/tournament-import/import-copy.ts"),
  "utf8",
);
const styles = fs.readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

describe("import server action contract", () => {
  it("requires organizer/admin access and never accepts an actor or submission from form data", () => {
    expect(organizer).toContain("validateWorkspaceAccess(rawToken)");
    expect(admin).toContain("requireAdmin()");
    expect(organizer).not.toMatch(/formData\.get\(["']submissionId/);
    expect(admin).not.toMatch(/formData\.get\(["']actor/);
    expect(service).not.toContain("rawToken:");
  });

  it("revalidates organizer, admin and both locale public projections after apply", () => {
    expect(organizer).toContain("revalidatePublicTournamentProjection");
    expect(organizer).toContain("/matches");
    expect(organizer).toContain("/admin/submissions/");
    expect(admin).toContain("revalidatePublicTournamentProjection");
  });

  it("keeps every export from use-server modules async", () => {
    for (const source of [organizer, admin]) {
      expect(source).toMatch(/^"use server"/);
      expect(source).not.toMatch(
        /export\s+(?:const|let|var|class|type|interface)\s+/,
      );
      expect(source.match(/export async function/g)?.length).toBeGreaterThan(0);
    }
  });

  it("exposes guarded timezone confirmation for organizer and admin sessions", () => {
    expect(organizer).toContain(
      "export async function confirmWorkspaceImportTimezoneAction",
    );
    expect(admin).toContain(
      "export async function confirmAdminImportTimezoneAction",
    );
    expect(organizer).toContain('formData.get("confirmTimezone")');
    expect(admin).toContain('formData.get("confirmTimezone")');
    expect(service).toContain("importTimezoneSchema");
    expect(service).toContain("executeConfirmImportTimezoneRpc");
    expect(organizer).toContain('submission.timezone || "UTC"');
    expect(admin).toContain('submission.timezone || "UTC"');
    expect(workspace).toContain("timezone_confirmation_required && !locked");
    expect(workspace).toContain('name="confirmTimezone"');
    expect(workspace).toContain("disabled={blocking");
    expect(copy).toContain('timezoneTitle: "Confirm import timezone"');
    expect(copy).toContain('timezoneTitle: "Подтвердите часовой пояс импорта"');
  });

  it("renders localized severity and source references in a mobile-safe preview", () => {
    expect(workspace).toContain("getImportIssueMessage(locale, code)");
    expect(workspace).toContain("sourceReferences(row.source_references)");
    expect(workspace).not.toContain("jsonList(row.validation_errors).join");
    expect(copy).toContain('blockingSeverity: "Blocking"');
    expect(copy).toContain('blockingSeverity: "Блокирует импорт"');
    expect(styles).toContain(".importJson");
    expect(styles).toContain("overflow-wrap: anywhere");
    expect(styles).toContain("@media (max-width: 40rem)");
  });

  it("refreshes resolved conflicts and keeps risky controls decision-specific", () => {
    for (const action of [organizer, admin]) {
      expect(action).toContain('formData.get("sessionVersion")');
      expect(action).toContain("revalidatePath(");
      expect(action).toContain("filter=conflict&resolved=1");
      expect(action).toContain("error.code");
    }
    expect(workspace).toContain('filter !== "conflict"');
    expect(workspace).toContain('resolution_status !== "resolved"');
    expect(resolutionForm).toContain('decision === "link_existing"');
    expect(resolutionForm).toContain('type="search"');
    expect(resolutionForm).toContain('type="hidden"');
    expect(resolutionForm).toContain(
      'decision === "use_spreadsheet" && highRiskCompletedResult',
    );
    expect(resolutionForm).toContain("disabled={pending || disabled}");
    expect(copy).toContain(
      "Conflict resolved. The preview has been refreshed.",
    );
    expect(copy).toContain("Конфликт разрешён. Предпросмотр обновлён.");
    expect(copy).toContain("import_session_stale");
  });

  it("recomputes readiness from the database and preserves actionable apply errors", () => {
    expect(service).toContain("recomputeImportReadinessRpc");
    expect(service).toContain("import_blocking_row|");
    for (const action of [organizer, admin]) {
      expect(action).toContain("error instanceof TournamentImportError");
      expect(action).toContain("encodeURIComponent(code)");
    }
    expect(copy).toContain('kind === "import_blocking_row"');
    expect(copy).toContain(
      "A blocking ${entity} remains in ${sheet}, row ${row}.",
    );
  });
});
