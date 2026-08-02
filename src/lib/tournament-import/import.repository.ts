import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { OperationalRpcAccess } from "@/lib/operational-workspace/access-context";
import type {
  ImportedEntity,
  ImportResolution,
  TournamentImportBundle,
} from "./import-model";
import type { ExistingImportSnapshot } from "./import-validation";
import { importNeedsTimezoneConfirmation } from "./import-timezone";

export async function selectImportSnapshot(
  submissionId: string,
): Promise<ExistingImportSnapshot> {
  const client = createSupabaseAdminClient();
  const [
    stages,
    teams,
    players,
    matches,
    rosters,
    groupAssignments,
    bracketLinks,
  ] = await Promise.all([
    client
      .from("tournament_stages")
      .select("id,name,sequence_number,stage_type")
      .eq("submission_id", submissionId),
    client
      .from("tournament_teams")
      .select("id,name,short_name,external_team_id")
      .eq("submission_id", submissionId),
    client
      .from("players")
      .select(
        "id,display_name,deadlock_account_id,steam_id,external_player_id",
      ),
    client
      .from("tournament_matches")
      .select(
        "id,stage_id,match_number,deadlock_match_id,status,team_a_id,team_b_id,scheduled_at",
      )
      .eq("submission_id", submissionId),
    client
      .from("tournament_roster_members")
      .select(
        "id,tournament_team_id,player_id,role,tournament_teams!inner(submission_id)",
      )
      .eq("tournament_teams.submission_id", submissionId),
    client
      .from("tournament_stage_group_teams")
      .select("id,stage_id,team_id,group_name")
      .eq("submission_id", submissionId),
    client
      .from("tournament_bracket_links")
      .select("id,source_match_id,outcome,target_match_id,target_slot")
      .eq("submission_id", submissionId),
  ]);
  const error =
    stages.error ??
    teams.error ??
    players.error ??
    matches.error ??
    rosters.error ??
    groupAssignments.error ??
    bracketLinks.error;
  if (error) throw error;
  return {
    stages: stages.data ?? [],
    teams: teams.data ?? [],
    players: players.data ?? [],
    matches: matches.data ?? [],
    rosters: (rosters.data ??
      []) as unknown as ExistingImportSnapshot["rosters"],
    groupAssignments: groupAssignments.data ?? [],
    bracketLinks: bracketLinks.data ?? [],
  };
}

function rowStatus(entity: ImportedEntity) {
  if (entity.proposedAction === "invalid") return "invalid";
  if (entity.proposedAction === "conflict") return "conflict";
  return entity.warnings.length ? "warning" : "valid";
}

export type CreateImportRecord = {
  submissionId: string;
  sourceType: "xlsx" | "google_sheets";
  sourceFilename: string;
  sourceUrlSafe: string | null;
  fingerprint: string;
  bundle: TournamentImportBundle;
  summary: Record<string, unknown>;
  mappingConfig?: Json;
  access: OperationalRpcAccess;
};

export async function insertImportSession(input: CreateImportRecord) {
  const client = createSupabaseAdminClient();
  const { error: expiryError } = await client.rpc(
    "expire_tournament_import_sessions",
  );
  if (expiryError) throw expiryError;
  const timezoneConfirmationRequired = importNeedsTimezoneConfirmation(
    input.bundle,
  );
  const status =
    input.bundle.templateType === "unknown" ||
    input.bundle.entities.length === 0
      ? "mapping_required"
      : Number(input.summary.invalid ?? 0) > 0
        ? "validation_failed"
        : Number(input.summary.conflict ?? 0) > 0
          ? "validation_failed"
          : timezoneConfirmationRequired
            ? "validation_failed"
            : "ready";
  const { data: session, error } = await client
    .from("tournament_import_sessions")
    .insert({
      submission_id: input.submissionId,
      source_type: input.sourceType,
      source_filename: input.sourceFilename.slice(0, 255),
      source_url_safe: input.sourceUrlSafe,
      source_fingerprint: input.fingerprint,
      template_type: input.bundle.templateType,
      status,
      detected_sheets: input.bundle.detectedSheets,
      mapping_config: input.mappingConfig ?? {},
      validation_summary: {
        ...input.summary,
        timezoneConfirmationRequired,
      } as Json,
      import_summary: {},
      fallback_timezone: input.bundle.fallbackTimezone ?? "UTC",
      timezone_confirmation_required: timezoneConfirmationRequired,
      created_by_actor_type: input.access.p_actor_type,
      created_by_actor_id: input.access.p_actor_id,
      created_by_workspace_token_id: input.access.p_workspace_token_id,
    })
    .select("*")
    .single();
  if (error) throw error;

  if (input.bundle.entities.length) {
    const rows = input.bundle.entities.map((entity) => ({
      session_id: session.id,
      entity_type: entity.entityType,
      source_sheet: entity.source.sheet,
      source_row_number: entity.source.row,
      source_key: entity.source.key,
      normalized_payload: entity.data as Json,
      validation_status: rowStatus(entity),
      validation_errors: entity.errors,
      warnings: entity.warnings,
      proposed_action: entity.proposedAction,
      existing_entity_id: entity.existingEntityId,
      resolution: entity.resolution as Json | null,
    }));
    const { error: rowsError } = await client
      .from("tournament_import_rows")
      .insert(rows);
    if (rowsError) {
      await client
        .from("tournament_import_sessions")
        .delete()
        .eq("id", session.id);
      throw rowsError;
    }
  }

  const actorType =
    input.access.p_actor_type === "admin" ? "admin" : "organizer";
  const actorId =
    input.access.p_actor_type === "admin" ? input.access.p_actor_id : null;
  const metadata = {
    session_id: session.id,
    source_type: input.sourceType,
    template_type: input.bundle.templateType,
    counts: input.summary,
    error_count: Number(input.summary.errors ?? 0),
    warning_count: Number(input.summary.warnings ?? 0),
    fingerprint_prefix: input.fingerprint.slice(0, 12),
    operational_version: "v1",
    ...(input.access.p_actor_type === "organizer_workspace"
      ? { access_method: "workspace_link", workspace_version: "v1" }
      : {}),
  };
  const { error: eventError } = await client.from("submission_events").insert(
    [
      "import_uploaded",
      "import_parsed",
      ...(input.mappingConfig ? ["import_mapping_updated"] : []),
      "import_validated",
    ].map((event_type) => ({
      submission_id: input.submissionId,
      event_type,
      from_status: null,
      to_status: null,
      actor_type: actorType,
      actor_id: actorId,
      metadata: metadata as Json,
    })),
  );
  if (eventError) throw eventError;
  return session;
}

export async function selectImportSession(
  sessionId: string,
  submissionId: string,
) {
  const client = createSupabaseAdminClient();
  const [sessionResult, rowsResult] = await Promise.all([
    client
      .from("tournament_import_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("submission_id", submissionId)
      .maybeSingle(),
    client
      .from("tournament_import_rows")
      .select("*")
      .eq("session_id", sessionId)
      .order("entity_type")
      .order("source_row_number"),
  ]);
  if (sessionResult.error) throw sessionResult.error;
  if (rowsResult.error) throw rowsResult.error;
  return sessionResult.data
    ? { session: sessionResult.data, rows: rowsResult.data ?? [] }
    : null;
}

export async function updateImportResolution(
  sessionId: string,
  submissionId: string,
  rowId: string,
  resolution: ImportResolution,
) {
  const client = createSupabaseAdminClient();
  const { data: session, error: sessionError } = await client
    .from("tournament_import_sessions")
    .select("id,status")
    .eq("id", sessionId)
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (
    !session ||
    ["applying", "completed", "cancelled", "expired"].includes(session.status)
  ) {
    throw new Error("import_session_locked");
  }
  const { error } = await client
    .from("tournament_import_rows")
    .update({ resolution: resolution as Json })
    .eq("id", rowId)
    .eq("session_id", sessionId)
    .eq("proposed_action", "conflict");
  if (error) throw error;
  const { count, error: countError } = await client
    .from("tournament_import_rows")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("proposed_action", "conflict")
    .is("resolution", null);
  if (countError) throw countError;
  const { count: invalidCount, error: invalidError } = await client
    .from("tournament_import_rows")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("proposed_action", "invalid");
  if (invalidError) throw invalidError;
  await client
    .from("tournament_import_sessions")
    .update({
      status: count === 0 && invalidCount === 0 ? "ready" : "validation_failed",
    })
    .eq("id", sessionId);
}

export async function insertImportAuditEvent(
  submissionId: string,
  eventType: string,
  sessionId: string,
  access: OperationalRpcAccess,
) {
  const { error } = await createSupabaseAdminClient()
    .from("submission_events")
    .insert({
      submission_id: submissionId,
      event_type: eventType,
      from_status: null,
      to_status: null,
      actor_type: access.p_actor_type === "admin" ? "admin" : "organizer",
      actor_id: access.p_actor_type === "admin" ? access.p_actor_id : null,
      metadata: {
        session_id: sessionId,
        operational_version: "v1",
        ...(access.p_actor_type === "organizer_workspace"
          ? { access_method: "workspace_link", workspace_version: "v1" }
          : {}),
      },
    });
  if (error) throw error;
}

export async function executeApplyImportRpc(
  sessionId: string,
  submissionId: string,
  access: OperationalRpcAccess,
) {
  const client = createSupabaseAdminClient();
  const args = {
    p_session_id: sessionId,
    p_submission_id: submissionId,
    ...access,
  };
  const { data, error } = await client.rpc(
    "apply_tournament_import_session",
    args,
  );
  if (!error) return data;
  await client.rpc("mark_tournament_import_failed", {
    ...args,
    p_error_code: error.message.slice(0, 80),
  });
  throw error;
}

export async function executeCancelImportRpc(
  sessionId: string,
  submissionId: string,
  access: OperationalRpcAccess,
) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "cancel_tournament_import_session",
    {
      p_session_id: sessionId,
      p_submission_id: submissionId,
      ...access,
    },
  );
  if (error) throw error;
  return data;
}

export async function executeConfirmImportTimezoneRpc(
  sessionId: string,
  submissionId: string,
  timezone: string,
  access: OperationalRpcAccess,
) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "confirm_tournament_import_timezone",
    {
      p_session_id: sessionId,
      p_submission_id: submissionId,
      p_timezone: timezone,
      ...access,
    },
  );
  if (error) throw error;
  return data;
}
