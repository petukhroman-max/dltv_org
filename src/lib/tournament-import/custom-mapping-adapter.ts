import "server-only";

import { createHash } from "node:crypto";
import { Workbook, type Cell, type Worksheet } from "exceljs";

import {
  importColumnMappingSchema,
  type ImportColumnMapping,
} from "./column-mapping";
import {
  importSlug,
  normalizeImportName,
  tournamentImportBundleSchema,
  type ImportedEntity,
} from "./import-model";
import {
  assertSafeXlsxArchive,
  sanitizeSpreadsheetText,
  withWorkbookProcessingTimeout,
  WorkbookSecurityError,
  workbookLimits,
} from "./workbook-security";

function text(cell: Cell) {
  if (
    cell.type === 6 ||
    (cell.value && typeof cell.value === "object" && "formula" in cell.value)
  )
    return null;
  if (cell.value instanceof Date) return cell.value.toISOString();
  if (cell.value && typeof cell.value === "object" && "text" in cell.value)
    return sanitizeSpreadsheetText(cell.value.text);
  return sanitizeSpreadsheetText(cell.value);
}

function headerMap(sheet: Worksheet, required: string[]) {
  for (let row = 1; row <= Math.min(sheet.rowCount, 50); row += 1) {
    const map = new Map<string, number>();
    for (
      let column = 1;
      column <= Math.min(sheet.columnCount, workbookLimits.columns);
      column += 1
    ) {
      const value = text(sheet.getCell(row, column));
      if (value) map.set(normalizeImportName(value), column);
    }
    if (required.every((header) => map.has(normalizeImportName(header))))
      return { row, map };
  }
  throw new WorkbookSecurityError("mapping_headers_not_found");
}

function get(
  sheet: Worksheet,
  row: number,
  headers: Map<string, number>,
  header: string | null,
) {
  if (!header) return null;
  const column = headers.get(normalizeImportName(header));
  return column ? text(sheet.getCell(row, column)) : null;
}

const teamKey = (name: string) => `team:${normalizeImportName(name)}`;
const playerKey = (name: string, id: string | null) =>
  id ? `player:id:${id}` : `player:name:${normalizeImportName(name)}`;

function numeric(value: string | null) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveInteger(value: string | null) {
  const number = numeric(value);
  return number !== null && Number.isInteger(number) && number > 0
    ? number
    : null;
}
function nonnegativeInteger(value: string | null) {
  const number = numeric(value);
  return number !== null && Number.isInteger(number) && number >= 0
    ? number
    : null;
}
function oddBestOf(value: string | null) {
  const number = positiveInteger(value);
  return number !== null && number % 2 === 1 ? number : null;
}
function httpUrl(value: string | null) {
  if (!value) return null;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}
const matchStatuses = new Set([
  "draft",
  "scheduled",
  "live",
  "completed",
  "postponed",
  "cancelled",
  "walkover",
]);

function role(
  value: string | null,
): "player" | "substitute" | "coach" | "manager" | null {
  const normalized = normalizeImportName(value ?? "");
  if (normalized.includes("coach")) return "coach";
  if (normalized.includes("manager")) return "manager";
  if (normalized.includes("sub")) return "substitute";
  if (
    normalized.includes("player") ||
    normalized.includes("captain") ||
    normalized.includes("starter")
  )
    return "player";
  return null;
}

function parseDate(value: string | null) {
  if (!value) return { value: null, warning: null };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    return { value: null, warning: "invalid_date" };
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return {
    value: parsed.toISOString(),
    warning: hasOffset ? null : "timezone_fallback_confirmation_required",
  };
}

export async function parseCustomMappedWorkbook(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  fallbackTimezone: string;
  mapping: unknown;
}) {
  const mapping = importColumnMappingSchema.parse(input.mapping);
  await assertSafeXlsxArchive(input.buffer, input.filename, input.mimeType);
  const workbook = new Workbook();
  await withWorkbookProcessingTimeout(
    workbook.xlsx.load(input.buffer as never),
  );
  if (workbook.worksheets.length > workbookLimits.sheets)
    throw new WorkbookSecurityError("workbook_sheet_limit_exceeded");
  const entities: ImportedEntity[] = [];
  const seenTeams = new Set<string>();
  const seenStages = new Set<string>();
  const seenPlayers = new Set<string>();
  const addTeam = (
    name: string,
    sheet: string,
    row: number,
    extra: Partial<{
      shortName: string | null;
      region: string | null;
      seed: number | null;
    }> = {},
  ) => {
    const key = teamKey(name);
    if (seenTeams.has(key)) return;
    seenTeams.add(key);
    entities.push({
      entityType: "team",
      source: { sheet, row, key },
      data: {
        name,
        shortName: extra.shortName ?? null,
        region: extra.region ?? null,
        seed: extra.seed ?? null,
        externalTeamId: null,
      },
      warnings: [],
      errors: [],
      proposedAction: "create",
      existingEntityId: null,
      resolution: null,
    });
  };
  const addStage = (name: string, sheet: string, row: number) => {
    const key = `stage:${importSlug(name)}`;
    if (seenStages.has(key)) return key;
    seenStages.add(key);
    entities.push({
      entityType: "stage",
      source: { sheet, row, key },
      data: {
        name,
        stageType: "custom",
        sequenceNumber: seenStages.size,
        timezone: null,
        bestOfDefault: null,
      },
      warnings: [],
      errors: [],
      proposedAction: "create",
      existingEntityId: null,
      resolution: null,
    });
    return key;
  };

  const teamSheet = workbook.getWorksheet(mapping.teamSheet);
  if (!teamSheet) throw new WorkbookSecurityError("mapping_sheet_not_found");
  const teamHeaders = headerMap(teamSheet, [mapping.teams.teamName]);
  for (let row = teamHeaders.row + 1; row <= teamSheet.rowCount; row += 1) {
    const name = get(teamSheet, row, teamHeaders.map, mapping.teams.teamName);
    if (!name) continue;
    addTeam(name, teamSheet.name, row, {
      shortName: get(teamSheet, row, teamHeaders.map, mapping.teams.shortName),
      region: get(teamSheet, row, teamHeaders.map, mapping.teams.region),
      seed: numeric(get(teamSheet, row, teamHeaders.map, mapping.teams.seed)),
    });
  }

  if (mapping.playerSheet) {
    const sheet = workbook.getWorksheet(mapping.playerSheet);
    if (!sheet) throw new WorkbookSecurityError("mapping_sheet_not_found");
    const headers = headerMap(sheet, [
      mapping.players.displayName,
      mapping.players.team,
      mapping.players.role,
    ]);
    for (let row = headers.row + 1; row <= sheet.rowCount; row += 1) {
      const name = get(sheet, row, headers.map, mapping.players.displayName);
      const team = get(sheet, row, headers.map, mapping.players.team);
      const mappedRole = role(
        get(sheet, row, headers.map, mapping.players.role),
      );
      if (!name || !team || !mappedRole) continue;
      addTeam(team, sheet.name, row);
      const platformId = get(
        sheet,
        row,
        headers.map,
        mapping.players.platformId,
      );
      const rawCountry = get(sheet, row, headers.map, mapping.players.country);
      const countryCode =
        rawCountry && /^[A-Za-z]{2}$/.test(rawCountry)
          ? rawCountry.toUpperCase()
          : null;
      const key = playerKey(name, platformId);
      if (!seenPlayers.has(key)) {
        seenPlayers.add(key);
        entities.push({
          entityType: "player",
          source: { sheet: sheet.name, row, key },
          data: {
            displayName: name,
            countryCode,
            platformId,
            externalPlayerId: null,
          },
          warnings: [],
          errors: rawCountry && !countryCode ? ["invalid_country_code"] : [],
          proposedAction: rawCountry && !countryCode ? "invalid" : "create",
          existingEntityId: null,
          resolution: null,
        });
      }
      entities.push({
        entityType: "roster_member",
        source: {
          sheet: sheet.name,
          row,
          key: `roster:${teamKey(team)}:${key}:${mappedRole}`,
        },
        data: {
          teamKey: teamKey(team),
          playerKey: key,
          role: mappedRole,
          isCaptain: /^(true|yes|1)$/i.test(
            get(sheet, row, headers.map, mapping.players.captain) ?? "",
          ),
        },
        warnings: [],
        errors: [],
        proposedAction: "create",
        existingEntityId: null,
        resolution: null,
      });
    }
  }

  const matchSheet = workbook.getWorksheet(mapping.matchSheet);
  if (!matchSheet) throw new WorkbookSecurityError("mapping_sheet_not_found");
  const matchHeaders = headerMap(matchSheet, [
    mapping.matches.stage,
    mapping.matches.teamA,
    mapping.matches.teamB,
  ]);
  for (let row = matchHeaders.row + 1; row <= matchSheet.rowCount; row += 1) {
    const stage = get(matchSheet, row, matchHeaders.map, mapping.matches.stage);
    const teamA = get(matchSheet, row, matchHeaders.map, mapping.matches.teamA);
    const teamB = get(matchSheet, row, matchHeaders.map, mapping.matches.teamB);
    if (!stage || !teamA || !teamB) continue;
    const stageKey = addStage(stage, matchSheet.name, row);
    addTeam(teamA, matchSheet.name, row);
    addTeam(teamB, matchSheet.name, row);
    const rowTimezone = get(
      matchSheet,
      row,
      matchHeaders.map,
      mapping.matches.timezone,
    );
    const scheduled = parseDate(
      get(matchSheet, row, matchHeaders.map, mapping.matches.scheduledDateTime),
    );
    const winner = null;
    const matchNumber = positiveInteger(
      get(matchSheet, row, matchHeaders.map, mapping.matches.matchNumber),
    );
    const external = get(
      matchSheet,
      row,
      matchHeaders.map,
      mapping.matches.deadlockMatchId,
    );
    const rawBo = get(
      matchSheet,
      row,
      matchHeaders.map,
      mapping.matches.bestOf,
    );
    const rawScoreA = get(
      matchSheet,
      row,
      matchHeaders.map,
      mapping.matches.scoreA,
    );
    const rawScoreB = get(
      matchSheet,
      row,
      matchHeaders.map,
      mapping.matches.scoreB,
    );
    const rawStatus = normalizeImportName(
      get(matchSheet, row, matchHeaders.map, mapping.matches.status) ?? "draft",
    );
    const rawStream = get(
      matchSheet,
      row,
      matchHeaders.map,
      mapping.matches.stream,
    );
    const rawVod = get(matchSheet, row, matchHeaders.map, mapping.matches.vod);
    const errors = [
      scheduled.warning === "invalid_date" ? "invalid_date" : null,
      rawBo && oddBestOf(rawBo) === null ? "invalid_best_of" : null,
      rawScoreA && nonnegativeInteger(rawScoreA) === null
        ? "invalid_score"
        : null,
      rawScoreB && nonnegativeInteger(rawScoreB) === null
        ? "invalid_score"
        : null,
      !matchStatuses.has(rawStatus) ? "invalid_status" : null,
      rawStream && !httpUrl(rawStream) ? "invalid_url" : null,
      rawVod && !httpUrl(rawVod) ? "invalid_url" : null,
    ].filter((value): value is string => Boolean(value));
    entities.push({
      entityType: "match",
      source: {
        sheet: matchSheet.name,
        row,
        key: external
          ? `match:deadlock:${external}`
          : `${stageKey}:match:${matchNumber ?? row}`,
      },
      data: {
        stageKey,
        group: get(matchSheet, row, matchHeaders.map, mapping.matches.group),
        round: get(matchSheet, row, matchHeaders.map, mapping.matches.round),
        matchNumber,
        teamAKey: teamKey(teamA),
        teamBKey: teamKey(teamB),
        scheduledAt: scheduled.value,
        timezone: rowTimezone,
        bestOf: oddBestOf(rawBo),
        scoreA: nonnegativeInteger(rawScoreA),
        scoreB: nonnegativeInteger(rawScoreB),
        status: (matchStatuses.has(rawStatus) ? rawStatus : "draft") as "draft",
        winnerTeamKey: winner,
        deadlockMatchId: external,
        streamUrl: httpUrl(rawStream),
        vodUrl: httpUrl(rawVod),
      },
      warnings:
        scheduled.warning &&
        scheduled.warning !== "invalid_date" &&
        !rowTimezone
          ? [scheduled.warning]
          : [],
      errors,
      proposedAction: errors.length ? "invalid" : "create",
      existingEntityId: null,
      resolution: null,
    });
  }
  const bundle = tournamentImportBundleSchema.parse({
    templateType: "custom_mapping",
    detectedSheets: workbook.worksheets.map((sheet) => sheet.name),
    fallbackTimezone: input.fallbackTimezone,
    entities,
    warnings: [],
  });
  return {
    fingerprint: createHash("sha256").update(input.buffer).digest("hex"),
    bundle,
    mapping: mapping as ImportColumnMapping,
  };
}
