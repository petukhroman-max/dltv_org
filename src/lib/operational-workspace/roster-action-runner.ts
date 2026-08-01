import "server-only";

import type { OperationalAccessContext } from "@/lib/operational-workspace/access-context";
import type {
  RosterActionState,
  RosterSearchState,
} from "@/lib/operational-workspace/roster-action-state";
import {
  addExistingPlayerToRoster,
  createPlayerAndAddToRoster,
  removeRosterMember,
  restoreRosterMember,
  RosterAuthorizationError,
  RosterConflictError,
  RosterDuplicateIdentityError,
  RosterValidationError,
  searchPlayersForRoster,
  updateRosterMembership,
  updateTournamentPlayerProfile,
} from "@/lib/operational-workspace/roster.service";

export type RosterOperation =
  | "create_player"
  | "add_existing"
  | "update_player"
  | "update_membership"
  | "remove"
  | "restore";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
function optional(formData: FormData, name: string) {
  const value = text(formData, name).trim();
  return value === "" ? null : value;
}
function preserved(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [key, String(value)]),
  );
}
function membership(formData: FormData) {
  return {
    tournament_team_id: text(formData, "tournament_team_id"),
    role: text(formData, "role"),
    is_captain: formData.get("is_captain") === "on",
    joined_at: optional(formData, "joined_at"),
  };
}

export async function runRosterMutation(
  operation: RosterOperation,
  submissionId: string,
  context: OperationalAccessContext,
  formData: FormData,
): Promise<RosterActionState> {
  const values = preserved(formData);
  try {
    if (operation === "create_player") {
      await createPlayerAndAddToRoster(
        {
          submissionId,
          values: {
            ...membership(formData),
            new_player: {
              display_name: text(formData, "display_name"),
              country_code: optional(formData, "country_code"),
              steam_id: optional(formData, "steam_id"),
              deadlock_account_id: optional(formData, "deadlock_account_id"),
            },
            confirm_same_name: formData.get("confirm_same_name") === "on",
          },
        },
        context,
      );
    } else if (operation === "add_existing") {
      await addExistingPlayerToRoster(
        {
          submissionId,
          values: {
            ...membership(formData),
            player_id: text(formData, "player_id"),
          },
        },
        context,
      );
    } else if (operation === "update_player") {
      await updateTournamentPlayerProfile(
        {
          submissionId,
          values: {
            player_id: text(formData, "player_id"),
            expected_updated_at: text(formData, "expected_updated_at"),
            display_name: text(formData, "display_name"),
            country_code: optional(formData, "country_code"),
            steam_id: optional(formData, "steam_id"),
            deadlock_account_id: optional(formData, "deadlock_account_id"),
          },
        },
        context,
      );
    } else if (operation === "update_membership") {
      await updateRosterMembership(
        {
          submissionId,
          values: {
            membership_id: text(formData, "membership_id"),
            expected_updated_at: text(formData, "expected_updated_at"),
            role: text(formData, "role"),
            is_captain: formData.get("is_captain") === "on",
            is_active: true,
          },
        },
        context,
      );
    } else if (operation === "remove") {
      await removeRosterMember(
        {
          submissionId,
          values: {
            membership_id: text(formData, "membership_id"),
            expected_updated_at: text(formData, "expected_updated_at"),
          },
        },
        context,
      );
    } else {
      await restoreRosterMember(
        {
          submissionId,
          values: {
            membership_id: text(formData, "membership_id"),
            expected_updated_at: text(formData, "expected_updated_at"),
            role: text(formData, "role"),
          },
        },
        context,
      );
    }
    return {
      status: "success",
      message:
        operation === "remove"
          ? "Removed from roster."
          : operation === "restore"
            ? "Restored to roster."
            : "Roster saved.",
      fieldErrors: {},
      values: {},
    };
  } catch (error) {
    if (error instanceof RosterValidationError)
      return { status: "error", fieldErrors: error.fieldErrors, values };
    if (error instanceof RosterConflictError)
      return {
        status: "conflict",
        message:
          "This item was updated elsewhere. Refresh the page and try again.",
        fieldErrors: {},
        values,
      };
    if (error instanceof RosterDuplicateIdentityError)
      return {
        status: "error",
        message:
          error.reason === "platform_id"
            ? "That platform ID already belongs to an existing player. Search for and use the existing player."
            : "A player with the same display name exists. Select the confirmation checkbox to create a different player, or use the existing player.",
        fieldErrors: {},
        values,
      };
    if (error instanceof RosterAuthorizationError)
      return {
        status: "error",
        message: "This workspace link is invalid or no longer available.",
        fieldErrors: {},
        values: {},
      };
    return {
      status: "error",
      message: "We could not save this roster change. Please try again.",
      fieldErrors: {},
      values,
    };
  }
}

export async function runRosterSearch(
  submissionId: string,
  context: OperationalAccessContext,
  formData: FormData,
): Promise<RosterSearchState> {
  const query = text(formData, "query");
  try {
    const results = await searchPlayersForRoster(query, submissionId, context);
    return {
      status: "success",
      message: results.length ? undefined : "No matching players found.",
      fieldErrors: {},
      values: { query },
      results,
    };
  } catch (error) {
    if (error instanceof RosterValidationError)
      return {
        status: "error",
        fieldErrors: error.fieldErrors,
        values: { query },
        results: [],
      };
    return {
      status: "error",
      message: "Player search is unavailable. Please try again.",
      fieldErrors: {},
      values: { query },
      results: [],
    };
  }
}
