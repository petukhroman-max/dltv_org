import "server-only";

import { extname } from "node:path";

import yauzl from "yauzl";

export const workbookLimits = {
  fileBytes: 10 * 1024 * 1024,
  downloadTimeoutMs: 12_000,
  processingTimeoutMs: 15_000,
  archiveEntries: 2_000,
  uncompressedBytes: 50 * 1024 * 1024,
  compressionRatio: 100,
  sheets: 32,
  meaningfulRows: 10_000,
  columns: 128,
  cellCharacters: 4_096,
} as const;

export class WorkbookSecurityError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "WorkbookSecurityError";
  }
}

const xlsxMimeTypes = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "application/zip",
]);

function isSafeEntryName(name: string): boolean {
  return (
    !name.includes("\\") &&
    !name.startsWith("/") &&
    !name.split("/").includes("..") &&
    !/^[a-z]:/i.test(name)
  );
}

function openArchive(buffer: Buffer): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true, decodeStrings: true },
      (error, archive) => {
        if (error || !archive) reject(error ?? new Error("invalid_archive"));
        else resolve(archive);
      },
    );
  });
}

export async function assertSafeXlsxArchive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<void> {
  if (buffer.length === 0 || buffer.length > workbookLimits.fileBytes) {
    throw new WorkbookSecurityError("workbook_size_invalid");
  }
  if (extname(filename).toLowerCase() !== ".xlsx") {
    throw new WorkbookSecurityError("workbook_extension_invalid");
  }
  if (!xlsxMimeTypes.has(mimeType.toLowerCase())) {
    throw new WorkbookSecurityError("workbook_mime_invalid");
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new WorkbookSecurityError("workbook_signature_invalid");
  }

  let archive: yauzl.ZipFile;
  try {
    archive = await openArchive(buffer);
  } catch {
    throw new WorkbookSecurityError("workbook_malformed");
  }

  await new Promise<void>((resolve, reject) => {
    let entries = 0;
    let uncompressed = 0;
    let compressed = 0;
    let hasWorkbook = false;
    const fail = (code: string) => {
      archive.close();
      reject(new WorkbookSecurityError(code));
    };

    archive.on("entry", (entry: yauzl.Entry) => {
      entries += 1;
      uncompressed += entry.uncompressedSize;
      compressed += Math.max(entry.compressedSize, 1);
      const name = entry.fileName;
      if (!isSafeEntryName(name)) return fail("workbook_path_traversal");
      if (entry.generalPurposeBitFlag & 0x1) return fail("workbook_encrypted");
      if (/vbaProject\.bin|xl\/externalLinks\//i.test(name)) {
        return fail("workbook_active_content_rejected");
      }
      if (name === "xl/workbook.xml") hasWorkbook = true;
      if (
        entries > workbookLimits.archiveEntries ||
        uncompressed > workbookLimits.uncompressedBytes ||
        uncompressed / compressed > workbookLimits.compressionRatio
      ) {
        return fail("workbook_archive_limits_exceeded");
      }
      archive.readEntry();
    });
    archive.once("error", () => fail("workbook_malformed"));
    archive.once("end", () => {
      archive.close();
      if (!hasWorkbook) reject(new WorkbookSecurityError("workbook_malformed"));
      else resolve();
    });
    archive.readEntry();
  });
}

export function sanitizeSpreadsheetText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).normalize("NFKC").trim();
  if (!text) return null;
  if (text.length > workbookLimits.cellCharacters) {
    throw new WorkbookSecurityError("workbook_cell_too_long");
  }
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export async function withWorkbookProcessingTimeout<T>(
  operation: Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new WorkbookSecurityError("workbook_processing_timeout")),
          workbookLimits.processingTimeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
