import "server-only";

import { WorkbookSecurityError, workbookLimits } from "./workbook-security";

const sheetIdPattern = /^[A-Za-z0-9_-]{20,128}$/;

export type PublicGoogleSheet = {
  spreadsheetId: string;
  safeSourceUrl: string;
  exportUrl: string;
};

export function parsePublicGoogleSheetsUrl(value: string): PublicGoogleSheet {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WorkbookSecurityError("google_sheets_url_invalid");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "docs.google.com" ||
    url.username ||
    url.password
  ) {
    throw new WorkbookSecurityError("google_sheets_host_rejected");
  }
  const match = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)(?:\/.*)?$/);
  const spreadsheetId = match?.[1];
  if (!spreadsheetId || !sheetIdPattern.test(spreadsheetId)) {
    throw new WorkbookSecurityError("google_sheets_url_invalid");
  }
  return {
    spreadsheetId,
    safeSourceUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    exportUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`,
  };
}

export async function downloadPublicGoogleSheet(
  source: PublicGoogleSheet,
  fetcher: typeof fetch = fetch,
): Promise<Buffer> {
  const response = await fetcher(source.exportUrl, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(workbookLimits.downloadTimeoutMs),
    headers: {
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  if (response.status >= 300 && response.status < 400) {
    throw new WorkbookSecurityError("google_sheets_redirect_rejected");
  }
  if (!response.ok || !response.body) {
    throw new WorkbookSecurityError("google_sheets_download_failed");
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > workbookLimits.fileBytes) {
    throw new WorkbookSecurityError("google_sheets_download_too_large");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > workbookLimits.fileBytes) {
      await reader.cancel();
      throw new WorkbookSecurityError("google_sheets_download_too_large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}
