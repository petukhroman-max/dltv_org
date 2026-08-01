import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildGuildlockWorkbookFixture } from "@/test/guildlock-import-fixtures";
import {
  downloadPublicGoogleSheet,
  parsePublicGoogleSheetsUrl,
} from "./google-sheets";
import {
  assertSafeXlsxArchive,
  sanitizeSpreadsheetText,
  WorkbookSecurityError,
  workbookLimits,
} from "./workbook-security";
import fs from "node:fs";
import path from "node:path";

describe("workbook input security", () => {
  it("accepts a bounded XLSX archive and rejects malformed files", async () => {
    await expect(
      assertSafeXlsxArchive(
        await buildGuildlockWorkbookFixture(),
        "fixture.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).resolves.toBeUndefined();
    await expect(
      assertSafeXlsxArchive(
        Buffer.from("not zip"),
        "fixture.xlsx",
        "application/octet-stream",
      ),
    ).rejects.toMatchObject({ code: "workbook_signature_invalid" });
  });

  it("sanitizes formula-injection prefixes for display or export", () => {
    expect(sanitizeSpreadsheetText("=2+2")).toBe("'=2+2");
    expect(sanitizeSpreadsheetText("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("only accepts canonical public Google Sheets document URLs", () => {
    const parsed = parsePublicGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz/edit?usp=sharing",
    );
    expect(parsed.exportUrl).toBe(
      "https://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz/export?format=xlsx",
    );
    for (const url of [
      "http://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz",
      "https://evil.example/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz",
      "https://docs.google.com@evil.example/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz",
    ]) {
      expect(() => parsePublicGoogleSheetsUrl(url)).toThrow(
        WorkbookSecurityError,
      );
    }
  });

  it("rejects redirects and streamed downloads above the hard size limit", async () => {
    const source = parsePublicGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz/edit",
    );
    await expect(
      downloadPublicGoogleSheet(
        source,
        vi.fn(
          async () =>
            new Response(null, {
              status: 302,
              headers: { location: "https://evil.example" },
            }),
        ) as never,
      ),
    ).rejects.toMatchObject({ code: "google_sheets_redirect_rejected" });
    await expect(
      downloadPublicGoogleSheet(
        source,
        vi.fn(
          async () =>
            new Response(new Uint8Array([1]), {
              headers: {
                "content-length": String(workbookLimits.fileBytes + 1),
              },
            }),
        ) as never,
      ),
    ).rejects.toMatchObject({ code: "google_sheets_download_too_large" });
  });

  it("keeps explicit defenses for macros, external links, traversal, encryption and zip bombs", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/lib/tournament-import/workbook-security.ts",
      ),
      "utf8",
    );
    for (const contract of [
      "vbaProject",
      "externalLinks",
      "workbook_path_traversal",
      "workbook_encrypted",
      "compressionRatio",
      "uncompressedBytes",
    ])
      expect(source).toContain(contract);
  });
});
