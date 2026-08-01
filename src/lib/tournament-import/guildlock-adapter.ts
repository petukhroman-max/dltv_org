import "server-only";

import { createHash } from "node:crypto";

import { Workbook, type Cell, type Worksheet } from "exceljs";

import {
  importSlug,
  normalizeImportName,
  tournamentImportBundleSchema,
  type ImportedEntity,
  type TournamentImportBundle,
} from "./import-model";
import {
  assertSafeXlsxArchive,
  sanitizeSpreadsheetText,
  withWorkbookProcessingTimeout,
  WorkbookSecurityError,
  workbookLimits,
} from "./workbook-security";

export type TemplateDetection = {
  templateType: "guildlock_v1" | "custom_mapping" | "unknown";
  confidence: number;
  detectedSheets: string[];
  reasons: string[];
};

const characteristicSheets = [
  "Main Info",
  "Qualifiers Day 1",
  "QD1 Match info",
  "Qualifiers Day 2",
  "QD2 Match Info",
  "LAN",
  "LAN Match Info",
  "Rosters",
];

function cellText(cell: Cell): string | null {
  if (
    cell.type === 6 ||
    (cell.value && typeof cell.value === "object" && "formula" in cell.value)
  ) {
    return null;
  }
  if (cell.value instanceof Date) return cell.value.toISOString();
  if (cell.value && typeof cell.value === "object") {
    if ("text" in cell.value) return sanitizeSpreadsheetText(cell.value.text);
    if ("richText" in cell.value) {
      return sanitizeSpreadsheetText(
        cell.value.richText.map((item) => item.text).join(""),
      );
    }
    if ("result" in cell.value) return null;
  }
  return sanitizeSpreadsheetText(cell.value);
}

function source(sheet: string, row: number, key: string) {
  return { sheet, row, key };
}

function teamKey(name: string) {
  return `team:${normalizeImportName(name)}`;
}

function playerKey(name: string, platformId: string | null) {
  return platformId
    ? `player:id:${platformId}`
    : `player:name:${normalizeImportName(name)}`;
}

function stageEntity(
  sheet: string,
  name: string,
  stageType: "group_stage" | "double_elimination",
  sequenceNumber: number,
): ImportedEntity {
  return {
    entityType: "stage",
    source: source(sheet, 1, `stage:${importSlug(name)}`),
    data: {
      name,
      stageType,
      sequenceNumber,
      timezone: null,
      bestOfDefault: null,
    },
    warnings: ["timezone_fallback_confirmation_required"],
    errors: [],
    proposedAction: "create",
    existingEntityId: null,
    resolution: null,
  };
}

function addTeam(
  entities: ImportedEntity[],
  seen: Set<string>,
  name: string,
  sheet: string,
  row: number,
  seed: number | null = null,
) {
  const key = teamKey(name);
  if (seen.has(key)) return;
  seen.add(key);
  entities.push({
    entityType: "team",
    source: source(sheet, row, key),
    data: { name, shortName: null, region: null, seed, externalTeamId: null },
    warnings: [],
    errors: [],
    proposedAction: "create",
    existingEntityId: null,
    resolution: null,
  });
}

function parseGroupSheet(
  sheet: Worksheet,
  entities: ImportedEntity[],
  seenTeams: Set<string>,
) {
  const stageKey = "stage:qualifiers-day-1";
  const starts = [2, 7, 12, 17];
  for (const column of starts) {
    const groupName = cellText(sheet.getCell(2, column));
    if (!groupName) continue;
    for (let row = 4; row <= 9; row += 1) {
      const name = cellText(sheet.getCell(row, column));
      if (!name || /^team$/i.test(name)) continue;
      addTeam(entities, seenTeams, name, sheet.name, row);
      entities.push({
        entityType: "standings_group_assignment",
        source: source(
          sheet.name,
          row,
          `${stageKey}:${teamKey(name)}:${groupName}`,
        ),
        data: {
          stageKey,
          teamKey: teamKey(name),
          groupName: groupName.replace(/^group\s+/i, ""),
          sequenceNumber: row - 3,
        },
        warnings: [],
        errors: [],
        proposedAction: "create",
        existingEntityId: null,
        resolution: null,
      });
    }
  }
}

const matchNumberPattern = /match\s*(\d+)/i;

function parseMatchSheet(
  sheet: Worksheet,
  stageKey: string,
  entities: ImportedEntity[],
  seenTeams: Set<string>,
) {
  for (let row = 3; row <= Math.min(sheet.rowCount, 500); row += 1) {
    const teamA = cellText(sheet.getCell(row, 1));
    const teamB = cellText(sheet.getCell(row, 2));
    const label = cellText(sheet.getCell(row, 3));
    if (!teamA && !teamB) continue;
    if (
      !teamA ||
      !teamB ||
      /^example team/i.test(teamA) ||
      /^example team/i.test(teamB)
    )
      continue;
    addTeam(entities, seenTeams, teamA, sheet.name, row);
    addTeam(entities, seenTeams, teamB, sheet.name, row);
    const rawId = cellText(sheet.getCell(row, 4));
    const winner = cellText(sheet.getCell(row, 5));
    const isForfeit = rawId?.toUpperCase() === "FF";
    const matchNumber = label?.match(matchNumberPattern)?.[1];
    const group = label?.match(/group\s+([A-Za-z0-9_-]+)/i)?.[1] ?? null;
    const warnings = ["series_score_not_available"];
    if (winner && winner !== teamA && winner !== teamB)
      warnings.push("winner_not_participant");
    entities.push({
      entityType: "match",
      source: source(
        sheet.name,
        row,
        rawId && rawId !== "FF"
          ? `match:deadlock:${rawId}`
          : `${stageKey}:match:${matchNumber ?? row}`,
      ),
      data: {
        stageKey,
        group,
        round: label,
        matchNumber: matchNumber ? Number(matchNumber) : null,
        teamAKey: teamKey(teamA),
        teamBKey: teamKey(teamB),
        scheduledAt: null,
        timezone: null,
        bestOf: null,
        scoreA: null,
        scoreB: null,
        status:
          isForfeit && winner && (winner === teamA || winner === teamB)
            ? "walkover"
            : "draft",
        winnerTeamKey:
          winner === teamA || winner === teamB ? teamKey(winner) : null,
        deadlockMatchId: rawId && rawId !== "FF" ? rawId : null,
        streamUrl: null,
        vodUrl: null,
      },
      warnings,
      errors:
        winner && winner !== teamA && winner !== teamB
          ? ["winner_not_participant"]
          : [],
      proposedAction:
        winner && winner !== teamA && winner !== teamB ? "invalid" : "create",
      existingEntityId: null,
      resolution: null,
    });
  }
}

function mapRosterRole(value: string): {
  role: "player" | "substitute" | "coach" | "manager";
  isCaptain: boolean;
} | null {
  const role = normalizeImportName(value);
  if (role.includes("coach")) return { role: "coach", isCaptain: false };
  if (role.includes("manager")) return { role: "manager", isCaptain: false };
  if (role.includes("sub")) return { role: "substitute", isCaptain: false };
  if (
    role.includes("player") ||
    role.includes("core") ||
    role.includes("starter") ||
    role.includes("captain")
  ) {
    return { role: "player", isCaptain: role.includes("captain") };
  }
  return null;
}

function parseRosters(
  sheet: Worksheet,
  entities: ImportedEntity[],
  seenTeams: Set<string>,
) {
  const seenPlayers = new Set<string>();
  for (
    let headerRow = 1;
    headerRow <= Math.min(sheet.rowCount, 1_000);
    headerRow += 1
  ) {
    if (
      normalizeImportName(cellText(sheet.getCell(headerRow, 2)) ?? "") !==
      "role"
    )
      continue;
    const teamName =
      cellText(sheet.getCell(headerRow - 1, 1)) ??
      cellText(sheet.getCell(headerRow - 1, 2)) ??
      cellText(sheet.getCell(headerRow - 2, 1)) ??
      cellText(sheet.getCell(headerRow - 2, 2));
    if (!teamName) continue;
    addTeam(entities, seenTeams, teamName, sheet.name, headerRow - 1);
    const privateIdHeader = cellText(sheet.getCell(headerRow, 4));
    const hasMappedPrivateId = privateIdHeader
      ? /(?:platform|steam|deadlock).*id/i.test(privateIdHeader)
      : false;
    for (
      let row = headerRow + 1;
      row < Math.min(headerRow + 12, sheet.rowCount + 1);
      row += 1
    ) {
      const rawRole = cellText(sheet.getCell(row, 2));
      const displayName = cellText(sheet.getCell(row, 3));
      if (!rawRole && !displayName) break;
      if (!rawRole || !displayName) continue;
      const mappedRole = mapRosterRole(rawRole);
      if (!mappedRole) continue;
      const platformId = hasMappedPrivateId
        ? cellText(sheet.getCell(row, 4))
        : null;
      const key = playerKey(displayName, platformId);
      if (!seenPlayers.has(key)) {
        seenPlayers.add(key);
        entities.push({
          entityType: "player",
          source: source(sheet.name, row, key),
          data: {
            displayName,
            countryCode: null,
            platformId,
            externalPlayerId: null,
          },
          warnings: [],
          errors: [],
          proposedAction: "create",
          existingEntityId: null,
          resolution: null,
        });
      }
      entities.push({
        entityType: "roster_member",
        source: source(
          sheet.name,
          row,
          `roster:${teamKey(teamName)}:${key}:${mappedRole.role}`,
        ),
        data: { teamKey: teamKey(teamName), playerKey: key, ...mappedRole },
        warnings: [],
        errors: [],
        proposedAction: "create",
        existingEntityId: null,
        resolution: null,
      });
    }
  }
}

export class GuildlockWorkbookAdapter {
  detect(workbook: Workbook): TemplateDetection {
    const names = workbook.worksheets.map((sheet) => sheet.name);
    const characteristicCount = characteristicSheets.filter((name) =>
      names.includes(name),
    ).length;
    const qdHeader = workbook.getWorksheet("QD1 Match info");
    const hasMatchHeaders = qdHeader
      ? ["Team 1", "Team 2", "Match", "ID", "Winner"].every(
          (value, index) => cellText(qdHeader.getCell(2, index + 1)) === value,
        )
      : false;
    const roster = workbook.getWorksheet("Rosters");
    const hasRosterHeaders = roster
      ? Array.from(
          { length: Math.min(roster.rowCount, 300) },
          (_, index) => index + 1,
        ).some(
          (row) =>
            normalizeImportName(cellText(roster.getCell(row, 2)) ?? "") ===
              "role" &&
            normalizeImportName(
              cellText(roster.getCell(row, 3)) ?? "",
            ).includes("ign"),
        )
      : false;
    const confidence = Math.min(
      1,
      (characteristicCount / 8) * 0.7 +
        (hasMatchHeaders ? 0.2 : 0) +
        (hasRosterHeaders ? 0.1 : 0),
    );
    return {
      templateType:
        confidence >= 0.8
          ? "guildlock_v1"
          : confidence >= 0.4
            ? "custom_mapping"
            : "unknown",
      confidence,
      detectedSheets: names,
      reasons: [
        `${characteristicCount}/8 characteristic sheets`,
        hasMatchHeaders ? "match headers present" : "match headers missing",
        hasRosterHeaders ? "roster headers present" : "roster headers missing",
      ],
    };
  }

  parse(
    workbook: Workbook,
    fallbackTimezone: string | null,
  ): TournamentImportBundle {
    const detection = this.detect(workbook);
    if (detection.templateType !== "guildlock_v1") {
      return tournamentImportBundleSchema.parse({
        templateType: detection.templateType,
        detectedSheets: detection.detectedSheets,
        fallbackTimezone,
        entities: [],
        warnings: ["custom_mapping_required"],
      });
    }
    const entities: ImportedEntity[] = [
      stageEntity("Qualifiers Day 1", "Qualifiers Day 1", "group_stage", 1),
      stageEntity(
        "Qualifiers Day 2",
        "Qualifiers Day 2",
        "double_elimination",
        2,
      ),
      stageEntity("LAN", "LAN", "double_elimination", 3),
    ];
    const seenTeams = new Set<string>();
    const groupSheet = workbook.getWorksheet("Qualifiers Day 1");
    if (groupSheet) parseGroupSheet(groupSheet, entities, seenTeams);
    const matchSheets = [
      ["QD1 Match info", "stage:qualifiers-day-1"],
      ["QD2 Match Info", "stage:qualifiers-day-2"],
      ["LAN Match Info", "stage:lan"],
    ] as const;
    for (const [sheetName, stageKey] of matchSheets) {
      const sheet = workbook.getWorksheet(sheetName);
      if (sheet) parseMatchSheet(sheet, stageKey, entities, seenTeams);
    }
    const rosters = workbook.getWorksheet("Rosters");
    if (rosters) parseRosters(rosters, entities, seenTeams);
    return tournamentImportBundleSchema.parse({
      templateType: "guildlock_v1",
      detectedSheets: detection.detectedSheets,
      fallbackTimezone,
      entities,
      warnings: [
        "bracket_links_not_inferred",
        "picks_bans_ignored",
        "broadcast_talent_ignored",
      ],
    });
  }
}

export async function parseTournamentWorkbook(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  fallbackTimezone: string | null,
) {
  await assertSafeXlsxArchive(buffer, filename, mimeType);
  const workbook = new Workbook();
  try {
    await withWorkbookProcessingTimeout(workbook.xlsx.load(buffer as never));
  } catch {
    throw new WorkbookSecurityError("workbook_malformed");
  }
  if (workbook.worksheets.length > workbookLimits.sheets) {
    throw new WorkbookSecurityError("workbook_sheet_limit_exceeded");
  }
  let meaningfulRows = 0;
  for (const sheet of workbook.worksheets) {
    if (sheet.columnCount > workbookLimits.columns) {
      throw new WorkbookSecurityError("workbook_column_limit_exceeded");
    }
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values)
        ? row.values
        : Object.values(row.values);
      if (
        values.some(
          (value) => value !== null && value !== undefined && value !== "",
        )
      )
        meaningfulRows += 1;
    });
  }
  if (meaningfulRows > workbookLimits.meaningfulRows) {
    throw new WorkbookSecurityError("workbook_row_limit_exceeded");
  }
  const adapter = new GuildlockWorkbookAdapter();
  return {
    fingerprint: createHash("sha256").update(buffer).digest("hex"),
    detection: adapter.detect(workbook),
    bundle: adapter.parse(workbook, fallbackTimezone),
  };
}
