import { z } from "zod";

import {
  nullableHttpUrlSchema,
  nullableTrimmedString,
  operationalSourceSchema,
  operationalUuidSchema,
  scopedSlugSchema,
} from "@/lib/domain/operational-shared";
import type { TableRow } from "@/lib/supabase/database.types";

export const tournamentTeamStatuses = [
  "invited",
  "registered",
  "confirmed",
  "active",
  "eliminated",
  "withdrawn",
  "disqualified",
] as const;
export const tournamentTeamStatusSchema = z.enum(tournamentTeamStatuses);

const teamInputFields = z.object({
  submission_id: operationalUuidSchema,
  name: z.string().trim().min(1).max(200),
  short_name: nullableTrimmedString(50),
  slug: scopedSlugSchema,
  logo_url: nullableHttpUrlSchema,
  region: nullableTrimmedString(100),
  seed: z.number().int().positive().nullable().optional(),
  status: tournamentTeamStatusSchema.default("active"),
  external_team_id: nullableTrimmedString(200),
  source: operationalSourceSchema.default("manual"),
  is_public: z.boolean().default(true),
});

const teamEditableFields = teamInputFields.omit({
  submission_id: true,
  slug: true,
  source: true,
});

export const createTournamentTeamSchema = teamInputFields;
export const updateTournamentTeamSchema = teamInputFields
  .omit({ submission_id: true })
  .partial();

export const createTournamentTeamMutationSchema = teamEditableFields;
export const updateTournamentTeamMutationSchema = teamEditableFields.extend({
  id: operationalUuidSchema,
  expected_updated_at: z.string().datetime({ offset: true }),
});
export const deleteTournamentTeamSchema = z.object({
  id: operationalUuidSchema,
  expected_updated_at: z.string().datetime({ offset: true }),
});

export type TournamentTeamRow = TableRow<"tournament_teams">;
export type CreateTournamentTeamInput = z.infer<
  typeof createTournamentTeamSchema
>;
export type UpdateTournamentTeamInput = z.infer<
  typeof updateTournamentTeamSchema
>;
export type AdminTournamentTeam = TournamentTeamRow;
