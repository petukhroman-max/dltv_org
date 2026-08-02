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
});
