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
    expect(
      parsePublicGoogleSheetsUrl(
        "https://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz/view",
      ).spreadsheetId,
    ).toBe("AbCdEfGhIjKlMnOpQrStUvWxYz");
    for (const url of [
      "http://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz",
      "https://evil.example/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz",
      "https://docs.google.com@evil.example/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz",
      "https://docs.google.com/spreadsheets/d/short/edit",
    ]) {
      expect(() => parsePublicGoogleSheetsUrl(url)).toThrow(
        WorkbookSecurityError,
      );
    }
  });

  it("follows only the bounded Google export redirect and validates XLSX content", async () => {
    const source = parsePublicGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz/edit",
    );
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 307,
          headers: {
            location:
              "https://doc-0k-94-sheets.googleusercontent.com/export/abc?format=xlsx",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
          headers: {
            "content-type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        }),
      );
    await expect(
      downloadPublicGoogleSheet(source, fetcher as never),
    ).resolves.toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects non-Google redirects, private targets, HTML and oversized downloads", async () => {
    const source = parsePublicGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz/edit",
    );
    for (const location of [
      "https://evil.example/export/abc?format=xlsx",
      "https://127.0.0.1/export/abc?format=xlsx",
      "http://doc-0k-94-sheets.googleusercontent.com/export/abc?format=xlsx",
    ])
      await expect(
        downloadPublicGoogleSheet(
          source,
          vi.fn(
            async () =>
              new Response(null, { status: 302, headers: { location } }),
          ) as never,
        ),
      ).rejects.toMatchObject({ code: "google_sheets_redirect_rejected" });
    await expect(
      downloadPublicGoogleSheet(
        source,
        vi.fn(
          async () =>
            new Response("<html>private</html>", {
              headers: { "content-type": "text/html" },
            }),
        ) as never,
      ),
    ).rejects.toMatchObject({ code: "google_sheets_content_type_rejected" });
    await expect(
      downloadPublicGoogleSheet(
        source,
        vi.fn(
          async () =>
            new Response(new Uint8Array([1]), {
              headers: {
                "content-length": String(workbookLimits.fileBytes + 1),
                "content-type": "application/octet-stream",
              },
            }),
        ) as never,
      ),
    ).rejects.toMatchObject({ code: "google_sheets_download_too_large" });
  });

  it("returns a stable safe error for network failures", async () => {
    const source = parsePublicGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz/edit",
    );
    await expect(
      downloadPublicGoogleSheet(
        source,
        vi.fn(async () => {
          throw new TypeError("private network detail");
        }) as never,
      ),
    ).rejects.toMatchObject({ code: "google_sheets_download_failed" });
  });

  it("keeps one timeout budget across the entire Google download", async () => {
    vi.useFakeTimers();
    const source = parsePublicGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/AbCdEfGhIjKlMnOpQrStUvWxYz/edit",
    );
    const pending = downloadPublicGoogleSheet(
      source,
      vi.fn(
        async (_url, init) =>
          await new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ) as never,
    );
    const rejected = expect(pending).rejects.toMatchObject({
      code: "google_sheets_download_timeout",
    });
    await vi.advanceTimersByTimeAsync(workbookLimits.downloadTimeoutMs);
    await rejected;
    vi.useRealTimers();
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
