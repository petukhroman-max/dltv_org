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
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    workbookLimits.downloadTimeoutMs,
  );
  try {
    let url = source.exportUrl;
    let response: Response | null = null;
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      response = await fetcher(url, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
      if (response.status < 300 || response.status >= 400) break;
      if (redirects === 3)
        throw new WorkbookSecurityError("google_sheets_redirect_rejected");
      const location = response.headers.get("location");
      let redirectUrl: URL;
      try {
        redirectUrl = new URL(location ?? "");
      } catch {
        throw new WorkbookSecurityError("google_sheets_redirect_rejected");
      }
      const allowedHost =
        /^doc-[a-z0-9-]+-sheets\.googleusercontent\.com$/.test(
          redirectUrl.hostname,
        );
      const allowedQuery =
        redirectUrl.searchParams.size === 1 &&
        redirectUrl.searchParams.get("format") === "xlsx";
      if (
        redirectUrl.protocol !== "https:" ||
        redirectUrl.username ||
        redirectUrl.password ||
        redirectUrl.port ||
        !allowedHost ||
        !redirectUrl.pathname.startsWith("/export/") ||
        !allowedQuery
      )
        throw new WorkbookSecurityError("google_sheets_redirect_rejected");
      url = redirectUrl.toString();
    }
    if (!response?.ok || !response.body)
      throw new WorkbookSecurityError("google_sheets_download_failed");
    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (
      contentType &&
      ![
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
        "application/zip",
      ].includes(contentType)
    )
      throw new WorkbookSecurityError("google_sheets_content_type_rejected");
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > workbookLimits.fileBytes)
      throw new WorkbookSecurityError("google_sheets_download_too_large");
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
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    if (buffer.length < 2 || buffer[0] !== 0x50 || buffer[1] !== 0x4b)
      throw new WorkbookSecurityError("google_sheets_content_invalid");
    return buffer;
  } catch (error) {
    if (error instanceof WorkbookSecurityError) throw error;
    if (controller.signal.aborted)
      throw new WorkbookSecurityError("google_sheets_download_timeout");
    throw new WorkbookSecurityError("google_sheets_download_failed");
  } finally {
    clearTimeout(timeout);
  }
}
