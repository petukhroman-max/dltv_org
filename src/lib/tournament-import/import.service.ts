import "server-only";

import { z } from "zod";

import type { OperationalAccessContext } from "@/lib/operational-workspace/access-context";
import { toOperationalRpcAccess } from "@/lib/operational-workspace/access-context";
import {
  importResolutionSchema,
  redactImportEntity,
  type ImportedEntity,
} from "./import-model";
import {
  downloadPublicGoogleSheet,
  parsePublicGoogleSheetsUrl,
} from "./google-sheets";
import { parseTournamentWorkbook } from "./guildlock-adapter";
import { parseCustomMappedWorkbook } from "./custom-mapping-adapter";
import {
  executeApplyImportRpc,
  executeCancelImportRpc,
  executeConfirmImportTimezoneRpc,
  executeResolveImportConflictRpc,
  recomputeImportReadinessRpc,
  insertImportSession,
  selectImportSession,
  selectImportSnapshot,
} from "./import.repository";
import {
  summarizeImport,
  validateAndMatchImportBundle,
} from "./import-validation";
import { workbookLimits, WorkbookSecurityError } from "./workbook-security";
import {
  importTimezoneSchema,
  prepareImportTimezoneConfirmation,
} from "./import-timezone";

const uuidSchema = z.uuid();

export class TournamentImportError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "TournamentImportError";
  }
}

function checkSessionOwner(
  session: {
    created_by_actor_type: string;
    created_by_actor_id: string | null;
    created_by_workspace_token_id: string | null;
  },
  access: ReturnType<typeof toOperationalRpcAccess>,
) {
  const valid =
    access.p_actor_type === "admin"
      ? session.created_by_actor_type === "admin" &&
        session.created_by_actor_id === access.p_actor_id
      : session.created_by_actor_type === "organizer_workspace" &&
        session.created_by_workspace_token_id === access.p_workspace_token_id;
  if (!valid) throw new TournamentImportError("import_session_access_denied");
}

async function createFromBuffer(input: {
  submissionId: string;
  accessContext: OperationalAccessContext;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  sourceType: "xlsx" | "google_sheets";
  sourceUrlSafe: string | null;
  fallbackTimezone: string;
}) {
  try {
    const parsed = await parseTournamentWorkbook(
      input.buffer,
      input.filename,
      input.mimeType,
      input.fallbackTimezone,
    );
    const snapshot = await selectImportSnapshot(input.submissionId);
    const bundle = validateAndMatchImportBundle(
      prepareImportTimezoneConfirmation(parsed.bundle, input.fallbackTimezone),
      snapshot,
    );
    const summary = summarizeImport(bundle);
    return insertImportSession({
      submissionId: input.submissionId,
      sourceType: input.sourceType,
      sourceFilename: input.filename,
      sourceUrlSafe: input.sourceUrlSafe,
      fingerprint: parsed.fingerprint,
      bundle,
      summary,
      access: toOperationalRpcAccess(input.accessContext, input.submissionId),
    });
  } catch (error) {
    if (error instanceof WorkbookSecurityError)
      throw new TournamentImportError(error.code);
    if (error instanceof TournamentImportError) throw error;
    throw new TournamentImportError("import_parse_failed");
  }
}

export async function createXlsxImportSession(input: {
  submissionId: string;
  accessContext: OperationalAccessContext;
  file: File;
  fallbackTimezone: string;
}) {
  if (
    !(input.file instanceof File) ||
    input.file.size > workbookLimits.fileBytes
  ) {
    throw new TournamentImportError("workbook_size_invalid");
  }
  return createFromBuffer({
    ...input,
    buffer: Buffer.from(await input.file.arrayBuffer()),
    filename: input.file.name,
    mimeType: input.file.type,
    sourceType: "xlsx",
    sourceUrlSafe: null,
  });
}

export async function createGoogleSheetsImportSession(input: {
  submissionId: string;
  accessContext: OperationalAccessContext;
  url: string;
  fallbackTimezone: string;
}) {
  try {
    const source = parsePublicGoogleSheetsUrl(input.url);
    const buffer = await downloadPublicGoogleSheet(source);
    return createFromBuffer({
      ...input,
      buffer,
      filename: `google-sheet-${source.spreadsheetId.slice(0, 12)}.xlsx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sourceType: "google_sheets",
      sourceUrlSafe: source.safeSourceUrl,
    });
  } catch (error) {
    if (error instanceof WorkbookSecurityError)
      throw new TournamentImportError(error.code);
    if (error instanceof TournamentImportError) throw error;
    throw new TournamentImportError("google_sheets_download_failed");
  }
}

export async function createCustomMappedImportSession(input: {
  submissionId: string;
  accessContext: OperationalAccessContext;
  file: File;
  fallbackTimezone: string;
  mapping: unknown;
}) {
  if (
    !(input.file instanceof File) ||
    input.file.size > workbookLimits.fileBytes
  ) {
    throw new TournamentImportError("workbook_size_invalid");
  }
  try {
    const parsed = await parseCustomMappedWorkbook({
      buffer: Buffer.from(await input.file.arrayBuffer()),
      filename: input.file.name,
      mimeType: input.file.type,
      fallbackTimezone: input.fallbackTimezone,
      mapping: input.mapping,
    });
    const bundle = validateAndMatchImportBundle(
      prepareImportTimezoneConfirmation(parsed.bundle, input.fallbackTimezone),
      await selectImportSnapshot(input.submissionId),
    );
    return insertImportSession({
      submissionId: input.submissionId,
      sourceType: "xlsx",
      sourceFilename: input.file.name,
      sourceUrlSafe: null,
      fingerprint: parsed.fingerprint,
      bundle,
      summary: summarizeImport(bundle),
      mappingConfig: parsed.mapping as never,
      access: toOperationalRpcAccess(input.accessContext, input.submissionId),
    });
  } catch (error) {
    if (error instanceof WorkbookSecurityError)
      throw new TournamentImportError(error.code);
    if (error instanceof TournamentImportError) throw error;
    throw new TournamentImportError("import_mapping_invalid");
  }
}

export async function loadTournamentImportSession(
  sessionId: string,
  submissionId: string,
  context: OperationalAccessContext,
) {
  const ids = z
    .object({ sessionId: uuidSchema, submissionId: uuidSchema })
    .safeParse({ sessionId, submissionId });
  if (!ids.success) return null;
  const result = await selectImportSession(
    ids.data.sessionId,
    ids.data.submissionId,
  );
  if (!result) return null;
  checkSessionOwner(
    result.session,
    toOperationalRpcAccess(context, submissionId),
  );
  const snapshot = await selectImportSnapshot(ids.data.submissionId);
  const rosteredPlayerIds = new Set(
    snapshot.rosters.map((roster) => roster.player_id),
  );
  const stageNames = new Map(
    snapshot.stages.map((stage) => [stage.id, stage.name]),
  );
  const teamNames = new Map(snapshot.teams.map((team) => [team.id, team.name]));
  return {
    session: result.session,
    linkCandidates: [
      ...snapshot.stages.map((stage) => ({
        entityType: "stage",
        id: stage.id,
        label: stage.name,
      })),
      ...snapshot.teams.map((team) => ({
        entityType: "team",
        id: team.id,
        label: team.name,
      })),
      ...snapshot.players
        .filter((player) => rosteredPlayerIds.has(player.id))
        .map((player) => ({
          entityType: "player",
          id: player.id,
          label: player.display_name,
        })),
      ...snapshot.matches.map((match) => ({
        entityType: "match",
        id: match.id,
        label: `${stageNames.get(match.stage_id ?? "") ?? "—"} · ${
          teamNames.get(match.team_a_id ?? "") ?? "—"
        } — ${teamNames.get(match.team_b_id ?? "") ?? "—"} · ${
          match.match_number
            ? `#${match.match_number}`
            : match.deadlock_match_id
              ? `ID ${match.deadlock_match_id}`
              : "—"
        }`,
      })),
    ],
    rows: result.rows.map((row) => {
      const entity = {
        entityType: row.entity_type,
        source: {
          sheet: row.source_sheet,
          row: row.source_row_number,
          key: row.source_key,
          references: Array.isArray(row.source_references)
            ? row.source_references
            : undefined,
        },
        data: row.normalized_payload,
        warnings: row.warnings,
        errors: row.validation_errors,
        proposedAction: row.proposed_action,
        existingEntityId: row.existing_entity_id,
        resolution: row.resolution,
      } as unknown as ImportedEntity;
      return { ...row, preview_payload: redactImportEntity(entity).data };
    }),
  };
}

export async function resolveTournamentImportConflict(input: {
  sessionId: string;
  rowId: string;
  submissionId: string;
  context: OperationalAccessContext;
  expectedSessionUpdatedAt: unknown;
  resolution: unknown;
}) {
  const parsed = z
    .object({
      sessionId: uuidSchema,
      rowId: uuidSchema,
      submissionId: uuidSchema,
      expectedSessionUpdatedAt: z.string().datetime({ offset: true }),
    })
    .safeParse(input);
  const resolution = importResolutionSchema.safeParse(input.resolution);
  if (!parsed.success || !resolution.success)
    throw new TournamentImportError("import_resolution_invalid");
  const loaded = await loadTournamentImportSession(
    parsed.data.sessionId,
    parsed.data.submissionId,
    input.context,
  );
  if (!loaded) throw new TournamentImportError("import_session_not_found");
  try {
    return await executeResolveImportConflictRpc(
      parsed.data.sessionId,
      parsed.data.submissionId,
      parsed.data.rowId,
      resolution.data,
      parsed.data.expectedSessionUpdatedAt,
      toOperationalRpcAccess(input.context, parsed.data.submissionId),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safeCodes = [
      "import_session_stale",
      "import_session_locked",
      "import_session_expired",
      "import_row_not_found",
      "import_row_not_conflict",
      "import_resolution_already_resolved",
      "import_resolution_existing_not_found",
      "import_resolution_existing_required",
      "import_resolution_existing_rejected",
      "import_completed_result_confirmation_required",
    ];
    const code = safeCodes.find((candidate) => message.includes(candidate));
    throw new TournamentImportError(code ?? "import_resolution_failed");
  }
}

export async function confirmTournamentImportTimezone(input: {
  sessionId: string;
  submissionId: string;
  context: OperationalAccessContext;
  timezone: unknown;
}) {
  const parsed = z
    .object({
      sessionId: uuidSchema,
      submissionId: uuidSchema,
      timezone: importTimezoneSchema,
    })
    .safeParse(input);
  if (!parsed.success)
    throw new TournamentImportError("import_timezone_invalid");
  const loaded = await loadTournamentImportSession(
    parsed.data.sessionId,
    parsed.data.submissionId,
    input.context,
  );
  if (!loaded) throw new TournamentImportError("import_session_not_found");
  return executeConfirmImportTimezoneRpc(
    parsed.data.sessionId,
    parsed.data.submissionId,
    parsed.data.timezone,
    toOperationalRpcAccess(input.context, parsed.data.submissionId),
  );
}

export async function applyTournamentImportSession(
  sessionId: string,
  submissionId: string,
  context: OperationalAccessContext,
) {
  const loaded = await loadTournamentImportSession(
    sessionId,
    submissionId,
    context,
  );
  if (!loaded) throw new TournamentImportError("import_session_not_found");
  const access = toOperationalRpcAccess(context, submissionId);
  const readiness = await recomputeImportReadinessRpc(
    sessionId,
    submissionId,
    access,
  );
  if (
    !readiness ||
    typeof readiness !== "object" ||
    Array.isArray(readiness) ||
    readiness.ready !== true
  ) {
    const blocker =
      readiness && typeof readiness === "object" && !Array.isArray(readiness)
        ? readiness.blocker
        : null;
    if (blocker && typeof blocker === "object" && !Array.isArray(blocker)) {
      const entity = String(blocker.entity_type ?? "row");
      const sheet = String(blocker.source_sheet ?? "unknown");
      const row = String(blocker.source_row_number ?? "?");
      throw new TournamentImportError(
        `import_blocking_row|${entity}|${sheet}|${row}`,
      );
    }
    throw new TournamentImportError("import_session_not_ready");
  }
  return executeApplyImportRpc(sessionId, submissionId, access);
}

export async function cancelTournamentImportSession(
  sessionId: string,
  submissionId: string,
  context: OperationalAccessContext,
) {
  const loaded = await loadTournamentImportSession(
    sessionId,
    submissionId,
    context,
  );
  if (!loaded) throw new TournamentImportError("import_session_not_found");
  return executeCancelImportRpc(
    sessionId,
    submissionId,
    toOperationalRpcAccess(context, submissionId),
  );
}
