import {
  normalizeImportName,
  type ImportedEntity,
  type TournamentImportBundle,
} from "./import-model";

export type ExistingImportSnapshot = {
  stages: Array<{
    id: string;
    name: string;
    sequence_number: number;
    stage_type: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    short_name: string | null;
    external_team_id: string | null;
  }>;
  players: Array<{
    id: string;
    display_name: string;
    deadlock_account_id: string | null;
    steam_id: string | null;
    external_player_id: string | null;
  }>;
  matches: Array<{
    id: string;
    stage_id: string | null;
    match_number: number | null;
    deadlock_match_id: string | null;
    status: string;
    team_a_id: string | null;
    team_b_id: string | null;
    scheduled_at: string | null;
  }>;
  rosters: Array<{
    id: string;
    tournament_team_id: string;
    player_id: string;
    role: string;
  }>;
  groupAssignments: Array<{
    id: string;
    stage_id: string;
    team_id: string;
    group_name: string;
  }>;
  bracketLinks: Array<{
    id: string;
    source_match_id: string;
    outcome: string;
    target_match_id: string;
    target_slot: string;
  }>;
};

function mark(
  entity: ImportedEntity,
  action: ImportedEntity["proposedAction"],
  issue?: string,
): ImportedEntity {
  return {
    ...entity,
    proposedAction: action,
    errors: issue ? [...entity.errors, issue] : entity.errors,
  } as ImportedEntity;
}

function matchEntities(
  entities: ImportedEntity[],
  existing: ExistingImportSnapshot,
): ImportedEntity[] {
  const matchedStages = new Map<string, string>();
  const matchedTeams = new Map<string, string>();
  const matchedPlayers = new Map<string, string>();
  const matchedMatches = new Map<string, string>();
  return entities.map((entity) => {
    if (entity.proposedAction === "invalid") return entity;
    if (entity.entityType === "stage") {
      const candidates = existing.stages.filter(
        (stage) =>
          normalizeImportName(stage.name) ===
            normalizeImportName(entity.data.name) ||
          (stage.sequence_number === entity.data.sequenceNumber &&
            stage.stage_type === entity.data.stageType),
      );
      if (candidates.length > 1)
        return mark(entity, "conflict", "ambiguous_stage_match");
      if (
        candidates.length === 0 &&
        existing.stages.some(
          (stage) => stage.sequence_number === entity.data.sequenceNumber,
        )
      )
        return mark(entity, "conflict", "stage_sequence_conflict");
      if (candidates[0]) {
        matchedStages.set(entity.source.key, candidates[0].id);
        return {
          ...entity,
          proposedAction: "update",
          existingEntityId: candidates[0].id,
        };
      }
    }
    if (entity.entityType === "team") {
      const exact = existing.teams.filter(
        (team) =>
          (entity.data.externalTeamId &&
            team.external_team_id === entity.data.externalTeamId) ||
          normalizeImportName(team.name) ===
            normalizeImportName(entity.data.name),
      );
      const short = entity.data.shortName
        ? existing.teams.filter(
            (team) =>
              team.short_name &&
              normalizeImportName(team.short_name) ===
                normalizeImportName(entity.data.shortName!),
          )
        : [];
      const candidates = exact.length ? exact : short;
      if (candidates.length > 1)
        return mark(entity, "conflict", "ambiguous_team_match");
      if (candidates[0]) {
        matchedTeams.set(entity.source.key, candidates[0].id);
        return {
          ...entity,
          proposedAction: "update",
          existingEntityId: candidates[0].id,
        };
      }
    }
    if (entity.entityType === "player") {
      const candidates = existing.players.filter(
        (player) =>
          (entity.data.platformId &&
            [player.deadlock_account_id, player.steam_id].includes(
              entity.data.platformId,
            )) ||
          (entity.data.externalPlayerId &&
            player.external_player_id === entity.data.externalPlayerId) ||
          normalizeImportName(player.display_name) ===
            normalizeImportName(entity.data.displayName),
      );
      if (candidates.length > 1)
        return mark(entity, "conflict", "ambiguous_player_match");
      if (candidates[0]) {
        matchedPlayers.set(entity.source.key, candidates[0].id);
        return {
          ...entity,
          proposedAction: "skip",
          existingEntityId: candidates[0].id,
        };
      }
    }
    if (entity.entityType === "match") {
      const stageId = matchedStages.get(entity.data.stageKey);
      const candidates = existing.matches.filter(
        (match) =>
          (entity.data.deadlockMatchId &&
            match.deadlock_match_id === entity.data.deadlockMatchId) ||
          (stageId &&
            entity.data.matchNumber &&
            match.stage_id === stageId &&
            match.match_number === entity.data.matchNumber),
      );
      if (candidates.length > 1)
        return mark(entity, "conflict", "ambiguous_match");
      if (candidates[0]) {
        const candidate = candidates[0];
        matchedMatches.set(entity.source.key, candidate.id);
        if (
          candidate.status === "completed" ||
          candidate.status === "walkover"
        ) {
          return {
            ...entity,
            proposedAction: "conflict",
            existingEntityId: candidate.id,
            warnings: [
              ...entity.warnings,
              "completed_result_keep_existing_by_default",
            ],
            errors: [
              ...entity.errors,
              "completed_match_requires_explicit_resolution",
            ],
          };
        }
        return {
          ...entity,
          proposedAction: "update",
          existingEntityId: candidate.id,
        };
      }
    }
    if (entity.entityType === "roster_member") {
      const teamId = matchedTeams.get(entity.data.teamKey);
      const playerId = matchedPlayers.get(entity.data.playerKey);
      const existingRoster = existing.rosters.find(
        (row) =>
          row.tournament_team_id === teamId &&
          row.player_id === playerId &&
          row.role === entity.data.role,
      );
      if (existingRoster)
        return {
          ...entity,
          proposedAction: "update",
          existingEntityId: existingRoster.id,
        };
    }
    if (entity.entityType === "standings_group_assignment") {
      const stageId = matchedStages.get(entity.data.stageKey);
      const teamId = matchedTeams.get(entity.data.teamKey);
      const existingAssignment = existing.groupAssignments.find(
        (row) => row.stage_id === stageId && row.team_id === teamId,
      );
      if (existingAssignment)
        return {
          ...entity,
          proposedAction: "update",
          existingEntityId: existingAssignment.id,
        };
    }
    if (entity.entityType === "bracket_link") {
      const sourceId = matchedMatches.get(entity.data.sourceMatchKey);
      const targetId = matchedMatches.get(entity.data.targetMatchKey);
      const existingLink = existing.bracketLinks.find(
        (row) =>
          row.source_match_id === sourceId &&
          row.outcome === entity.data.outcome &&
          row.target_match_id === targetId &&
          row.target_slot === entity.data.targetSlot,
      );
      if (existingLink)
        return {
          ...entity,
          proposedAction: "skip",
          existingEntityId: existingLink.id,
        };
    }
    return entity;
  }) as ImportedEntity[];
}

function detectBracketCycle(entities: ImportedEntity[]): Set<string> {
  const links = entities.filter(
    (entity) => entity.entityType === "bracket_link",
  );
  const graph = new Map<string, string[]>();
  for (const link of links) {
    graph.set(link.data.sourceMatchKey, [
      ...(graph.get(link.data.sourceMatchKey) ?? []),
      link.data.targetMatchKey,
    ]);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    const cycle = (graph.get(node) ?? []).some(visit);
    visiting.delete(node);
    visited.add(node);
    if (cycle) cyclic.add(node);
    return cycle;
  };
  for (const node of graph.keys()) visit(node);
  return cyclic;
}

export function validateAndMatchImportBundle(
  bundle: TournamentImportBundle,
  existing: ExistingImportSnapshot,
): TournamentImportBundle {
  const stageKeys = new Set(
    bundle.entities
      .filter((e) => e.entityType === "stage")
      .map((e) => e.source.key),
  );
  const teamKeys = new Set(
    bundle.entities
      .filter((e) => e.entityType === "team")
      .map((e) => e.source.key),
  );
  const playerKeys = new Set(
    bundle.entities
      .filter((e) => e.entityType === "player")
      .map((e) => e.source.key),
  );
  const matchKeys = new Set(
    bundle.entities
      .filter((e) => e.entityType === "match")
      .map((e) => e.source.key),
  );
  const duplicates = new Set<string>();
  const matchCoordinates = new Map<string, number>();
  const groupCoordinates = new Map<string, number>();
  const seen = new Set<string>();
  for (const entity of bundle.entities) {
    if (seen.has(entity.source.key)) duplicates.add(entity.source.key);
    seen.add(entity.source.key);
    if (entity.entityType === "match" && entity.data.matchNumber !== null) {
      const key = `${entity.data.stageKey}:${entity.data.matchNumber}`;
      matchCoordinates.set(key, (matchCoordinates.get(key) ?? 0) + 1);
    }
    if (entity.entityType === "standings_group_assignment") {
      const key = `${entity.data.stageKey}:${entity.data.teamKey}`;
      groupCoordinates.set(key, (groupCoordinates.get(key) ?? 0) + 1);
    }
  }
  const cyclic = detectBracketCycle(bundle.entities);
  const structurallyValidated = bundle.entities.map((entity) => {
    if (duplicates.has(entity.source.key))
      return mark(entity, "invalid", "duplicate_source_key");
    if (entity.entityType === "roster_member") {
      if (!teamKeys.has(entity.data.teamKey))
        return mark(entity, "invalid", "unknown_team_reference");
      if (!playerKeys.has(entity.data.playerKey))
        return mark(entity, "invalid", "unknown_player_reference");
    }
    if (entity.entityType === "match") {
      if (
        entity.data.matchNumber !== null &&
        (matchCoordinates.get(
          `${entity.data.stageKey}:${entity.data.matchNumber}`,
        ) ?? 0) > 1
      )
        return mark(entity, "invalid", "duplicate_match_number");
      if (!stageKeys.has(entity.data.stageKey))
        return mark(entity, "invalid", "unknown_stage_reference");
      if (entity.data.teamAKey && !teamKeys.has(entity.data.teamAKey))
        return mark(entity, "invalid", "unknown_team_reference");
      if (entity.data.teamBKey && !teamKeys.has(entity.data.teamBKey))
        return mark(entity, "invalid", "unknown_team_reference");
      if (entity.data.teamAKey && entity.data.teamAKey === entity.data.teamBKey)
        return mark(entity, "invalid", "same_match_teams");
      if (
        entity.data.winnerTeamKey &&
        ![entity.data.teamAKey, entity.data.teamBKey].includes(
          entity.data.winnerTeamKey,
        )
      ) {
        return mark(entity, "invalid", "winner_not_participant");
      }
      if (
        entity.data.status === "completed" &&
        (entity.data.scoreA === null ||
          entity.data.scoreB === null ||
          !entity.data.winnerTeamKey)
      ) {
        return mark(entity, "invalid", "completed_match_result_required");
      }
    }
    if (entity.entityType === "standings_group_assignment") {
      if (
        (groupCoordinates.get(
          `${entity.data.stageKey}:${entity.data.teamKey}`,
        ) ?? 0) > 1
      )
        return mark(entity, "invalid", "cross_group_assignment_conflict");
      if (!stageKeys.has(entity.data.stageKey))
        return mark(entity, "invalid", "unknown_stage_reference");
      if (!teamKeys.has(entity.data.teamKey))
        return mark(entity, "invalid", "unknown_team_reference");
    }
    if (entity.entityType === "bracket_link") {
      if (
        !matchKeys.has(entity.data.sourceMatchKey) ||
        !matchKeys.has(entity.data.targetMatchKey)
      ) {
        return mark(entity, "invalid", "unknown_match_reference");
      }
      if (cyclic.has(entity.data.sourceMatchKey))
        return mark(entity, "invalid", "bracket_cycle");
    }
    return entity;
  }) as ImportedEntity[];
  return {
    ...bundle,
    entities: matchEntities(structurallyValidated, existing),
  };
}

export function summarizeImport(bundle: TournamentImportBundle) {
  const summary = {
    total: bundle.entities.length,
    create: 0,
    update: 0,
    skip: 0,
    conflict: 0,
    invalid: 0,
    warnings: bundle.warnings.length,
    errors: 0,
    byEntity: {} as Record<string, number>,
  };
  for (const entity of bundle.entities) {
    summary[entity.proposedAction] += 1;
    summary.warnings += entity.warnings.length;
    summary.errors += entity.errors.length;
    summary.byEntity[entity.entityType] =
      (summary.byEntity[entity.entityType] ?? 0) + 1;
  }
  return summary;
}
