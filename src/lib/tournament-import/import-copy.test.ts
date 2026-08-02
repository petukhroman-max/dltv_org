import { describe, expect, it } from "vitest";

import { getImportIssueMessage } from "./import-copy";

describe("import issue copy", () => {
  it("localizes technical import codes without exposing them as primary UI text", () => {
    expect(getImportIssueMessage("en", "winner_not_participant")).toBe(
      "The winner does not match either participant.",
    );
    expect(getImportIssueMessage("ru", "winner_not_participant")).toBe(
      "Победитель не совпадает ни с одной из команд матча.",
    );
    expect(getImportIssueMessage("en", "google_sheets_download_failed")).toBe(
      "The spreadsheet could not be downloaded. Make sure anyone with the link can view it.",
    );
    expect(getImportIssueMessage("ru", "google_sheets_download_failed")).toBe(
      "Не удалось скачать таблицу. Проверьте, что доступ открыт всем, у кого есть ссылка.",
    );
    expect(
      getImportIssueMessage("en", "google_sheets_redirect_rejected"),
    ).not.toContain("google_sheets_redirect_rejected");
    expect(getImportIssueMessage("ru", "unknown_internal_code")).not.toContain(
      "unknown_internal_code",
    );
  });

  it("identifies the exact blocking entity, sheet and source row", () => {
    const code = "import_blocking_row|match|QD2 Match Info|19";
    expect(getImportIssueMessage("en", code)).toBe(
      "A blocking match remains in QD2 Match Info, row 19.",
    );
    expect(getImportIssueMessage("ru", code)).toBe(
      "Остался блокирующий объект match в QD2 Match Info, строка 19.",
    );
  });

  it("explains the safe atomic apply failure without raw SQL", () => {
    const code =
      "import_apply_row|stage|LAN|1|create|stage_slug|import_database_function_missing";
    expect(getImportIssueMessage("en", code)).toBe(
      "Import failed while performing create for stage from “LAN”, row 1 (step stage_slug): a required database function is unavailable. All changes were rolled back.",
    );
    expect(getImportIssueMessage("ru", code)).toContain("«LAN», строка 1");
    expect(getImportIssueMessage("en", code)).not.toContain("digest(");
  });
});
