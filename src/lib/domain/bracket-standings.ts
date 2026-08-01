import { z } from "zod";

export const bracketSections = [
  "main",
  "winners",
  "losers",
  "grand_final",
  "third_place",
] as const;
export const bracketOutcomes = ["winner", "loser"] as const;
export const bracketSlots = ["team_a", "team_b"] as const;

export const bracketPositionSchema = z.object({
  match_id: z.uuid(),
  expected_updated_at: z.string().datetime({ offset: true }),
  bracket_type: z.enum(["single_elimination", "double_elimination"]),
  section: z.enum(bracketSections),
  round: z.coerce.number().int().positive().max(128),
  position: z.coerce.number().int().positive().max(1024),
});

export const bracketLinkSchema = z
  .object({
    stage_id: z.uuid(),
    source_match_id: z.uuid(),
    outcome: z.enum(bracketOutcomes),
    target_match_id: z.uuid(),
    target_slot: z.enum(bracketSlots),
  })
  .refine((value) => value.source_match_id !== value.target_match_id, {
    message: "A bracket link must target another match.",
    path: ["target_match_id"],
  });

export const standingsConfigSchema = z.object({
  stage_id: z.uuid(),
  expected_updated_at: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().datetime({ offset: true }).nullable().optional(),
  ),
  enabled: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  points_for_win: z.coerce.number().int().min(0).max(100),
  points_for_loss: z.coerce.number().int().min(0).max(100),
  points_for_walkover: z.coerce.number().int().min(0).max(100),
  score_difference_enabled: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  qualification_places: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
  calculation_mode: z.enum(["automatic", "manual_adjustment"]),
});

export const groupTeamSchema = z.object({
  stage_id: z.uuid(),
  team_id: z.uuid(),
  group_name: z.string().trim().min(1).max(80),
  sequence_number: z.coerce.number().int().positive(),
});

export const standingAdjustmentSchema = z.object({
  stage_id: z.uuid(),
  team_id: z.uuid(),
  expected_updated_at: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().datetime({ offset: true }).nullable().optional(),
  ),
  points_adjustment: z.coerce.number().int().min(-10000).max(10000),
  rank_override: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
  qualified_override: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .nullable(),
  ),
  public_note: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(500).nullable(),
  ),
});

export const bracketStageTypes = new Set([
  "single_elimination",
  "double_elimination",
  "playoff",
  "final",
  "custom",
]);
export const standingsStageTypes = new Set([
  "qualifier",
  "group_stage",
  "round_robin",
  "custom",
]);

export type BracketMatch = {
  id: string;
  match_number: number | null;
  round_name: string | null;
  bracket_section: string | null;
  bracket_round: number | null;
  bracket_position: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_team_id: string | null;
  status: string;
  updated_at: string;
};

export type BracketLink = {
  id: string;
  source_match_id: string;
  outcome: string;
  target_match_id: string;
  target_slot: string;
  updated_at: string;
};

export function validateStageBracket(
  matches: Array<
    Pick<BracketMatch, "id"> &
      Partial<
        Pick<
          BracketMatch,
          "bracket_section" | "bracket_round" | "bracket_position"
        >
      >
  >,
  links: Array<Pick<BracketLink, "id" | "source_match_id" | "target_match_id">>,
) {
  const matchIds = new Set(matches.map((match) => match.id));
  const unpositionedMatchIds = matches
    .filter(
      (match) =>
        !match.bracket_section ||
        match.bracket_round === null ||
        match.bracket_position === null,
    )
    .map((match) => match.id);
  const invalidLinkIds = links
    .filter(
      (link) =>
        !matchIds.has(link.source_match_id) ||
        !matchIds.has(link.target_match_id) ||
        link.source_match_id === link.target_match_id,
    )
    .map((link) => link.id);

  return {
    valid: unpositionedMatchIds.length === 0 && invalidLinkIds.length === 0,
    unpositionedMatchIds,
    invalidLinkIds,
  };
}

export type StandingRow = {
  team_id: string;
  team_name: string;
  team_slug: string;
  seed: number | null;
  group_name: string;
  played: number;
  wins: number;
  losses: number;
  score_for: number;
  score_against: number;
  score_diff: number;
  points: number;
  rank_override: number | null;
  rank: number;
  qualified: boolean;
  public_note: string | null;
};

type StandingTeam = {
  id: string;
  name: string;
  slug: string;
  seed: number | null;
};
type StandingMatch = {
  status: string;
  group_name: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_team_id: string | null;
};
type StandingAdjustment = {
  team_id: string;
  points_adjustment: number;
  rank_override: number | null;
  qualified_override: boolean | null;
  public_note: string | null;
};

export function calculateStandings(input: {
  teams: StandingTeam[];
  groups: Array<{ team_id: string; group_name: string }>;
  matches: StandingMatch[];
  adjustments: StandingAdjustment[];
  config: {
    points_for_win: number;
    points_for_loss: number;
    points_for_walkover: number;
    score_difference_enabled: boolean;
    qualification_places: number | null;
  };
}): StandingRow[] {
  const explicitGroups = new Map(
    input.groups.map((row) => [row.team_id, row.group_name]),
  );
  const membership = new Map<string, string>();
  for (const row of input.groups) membership.set(row.team_id, row.group_name);
  for (const match of input.matches) {
    for (const teamId of [match.team_a_id, match.team_b_id]) {
      if (teamId && !explicitGroups.has(teamId))
        membership.set(teamId, match.group_name ?? "default");
    }
  }
  const rows: Array<StandingRow & { qualified_override?: boolean | null }> = [
    ...membership.entries(),
  ].flatMap(([teamId, groupName]) => {
    const team = input.teams.find((candidate) => candidate.id === teamId);
    if (!team) return [];
    const games = input.matches.filter(
      (match) =>
        ["completed", "walkover"].includes(match.status) &&
        (match.team_a_id === teamId || match.team_b_id === teamId) &&
        (match.group_name ?? "default") === groupName,
    );
    let wins = 0;
    let losses = 0;
    let scoreFor = 0;
    let scoreAgainst = 0;
    let basePoints = 0;
    for (const game of games) {
      const sideA = game.team_a_id === teamId;
      const won = game.winner_team_id === teamId;
      if (won) {
        wins += 1;
        basePoints +=
          game.status === "walkover"
            ? input.config.points_for_walkover
            : input.config.points_for_win;
      } else {
        losses += 1;
        basePoints += input.config.points_for_loss;
      }
      const own = sideA ? game.score_a : game.score_b;
      const other = sideA ? game.score_b : game.score_a;
      if (own !== null && other !== null && own >= 0 && other >= 0) {
        scoreFor += own;
        scoreAgainst += other;
      }
    }
    const adjustment = input.adjustments.find(
      (item) => item.team_id === teamId,
    );
    return [
      {
        team_id: team.id,
        team_name: team.name,
        team_slug: team.slug,
        seed: team.seed,
        group_name: groupName,
        played: games.length,
        wins,
        losses,
        score_for: scoreFor,
        score_against: scoreAgainst,
        score_diff: scoreFor - scoreAgainst,
        points: basePoints + (adjustment?.points_adjustment ?? 0),
        rank_override: adjustment?.rank_override ?? null,
        rank: 0,
        qualified: false,
        public_note: adjustment?.public_note ?? null,
        qualified_override: adjustment?.qualified_override ?? null,
      },
    ];
  });
  const groups = [...new Set(rows.map((row) => row.group_name))];
  for (const group of groups) {
    const ranked = rows
      .filter((row) => row.group_name === group)
      .sort(
        (a, b) =>
          (a.rank_override ?? Number.MAX_SAFE_INTEGER) -
            (b.rank_override ?? Number.MAX_SAFE_INTEGER) ||
          b.points - a.points ||
          b.wins - a.wins ||
          (input.config.score_difference_enabled
            ? b.score_diff - a.score_diff
            : 0) ||
          b.score_for - a.score_for ||
          (a.seed ?? Number.MAX_SAFE_INTEGER) -
            (b.seed ?? Number.MAX_SAFE_INTEGER) ||
          a.team_name.localeCompare(b.team_name),
      );
    ranked.forEach((row, index) => {
      row.rank = row.rank_override ?? index + 1;
      row.qualified =
        row.qualified_override ??
        (input.config.qualification_places !== null &&
          row.rank <= input.config.qualification_places);
    });
  }
  return rows
    .sort(
      (a, b) =>
        a.group_name.localeCompare(b.group_name) ||
        (a.rank_override ?? Number.MAX_SAFE_INTEGER) -
          (b.rank_override ?? Number.MAX_SAFE_INTEGER) ||
        b.points - a.points ||
        b.wins - a.wins ||
        (input.config.score_difference_enabled
          ? b.score_diff - a.score_diff
          : 0) ||
        b.score_for - a.score_for ||
        (a.seed ?? Number.MAX_SAFE_INTEGER) -
          (b.seed ?? Number.MAX_SAFE_INTEGER) ||
        a.team_name.localeCompare(b.team_name),
    )
    .map((row) => {
      const safe = { ...row };
      delete safe.qualified_override;
      return safe;
    });
}
