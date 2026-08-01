import { z } from "zod";

import {
  nullableTrimmedString,
  operationalSourceSchema,
} from "@/lib/domain/operational-shared";
import type { TableRow } from "@/lib/supabase/database.types";

const playerInputFields = z.object({
  display_name: z.string().trim().min(1).max(200),
  normalized_name: z.string().trim().min(1).max(200),
  real_name: nullableTrimmedString(300),
  country_code: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  steam_id: nullableTrimmedString(100),
  deadlock_account_id: nullableTrimmedString(100),
  external_player_id: nullableTrimmedString(200),
  source: operationalSourceSchema.default("manual"),
  is_public: z.boolean().default(true),
});

export const createPlayerSchema = playerInputFields;
export const updatePlayerSchema = playerInputFields.partial();

export function normalizePlayerName(displayName: string) {
  return displayName.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

export type PlayerRow = TableRow<"players">;
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type SafeAdminPlayer = Pick<
  PlayerRow,
  | "id"
  | "display_name"
  | "normalized_name"
  | "country_code"
  | "steam_id"
  | "deadlock_account_id"
  | "external_player_id"
  | "source"
  | "is_public"
  | "created_at"
  | "updated_at"
>;

export function toSafeAdminPlayer(player: PlayerRow): SafeAdminPlayer {
  return {
    id: player.id,
    display_name: player.display_name,
    normalized_name: player.normalized_name,
    country_code: player.country_code,
    steam_id: player.steam_id,
    deadlock_account_id: player.deadlock_account_id,
    external_player_id: player.external_player_id,
    source: player.source,
    is_public: player.is_public,
    created_at: player.created_at,
    updated_at: player.updated_at,
  };
}
