import "server-only";

import type { OperationalAccessContext } from "@/lib/operational-workspace/access-context";
import type {
  OperationalActionState,
  OperationalEntity,
  OperationalOperation,
} from "@/lib/operational-workspace/action-state";
import {
  createTournamentStage,
  createTournamentTeam,
  deleteTournamentStage,
  deleteTournamentTeam,
  OperationalAuthorizationError,
  OperationalConflictError,
  OperationalDependencyError,
  OperationalValidationError,
  updateTournamentStage,
  updateTournamentTeam,
} from "@/lib/operational-workspace/operational-mutations.service";

function textValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function optionalText(formData: FormData, name: string) {
  const value = textValue(formData, name).trim();
  return value === "" ? null : value;
}

function optionalNumber(formData: FormData, name: string) {
  const value = textValue(formData, name).trim();
  return value === "" ? null : Number(value);
}

function stageValues(formData: FormData) {
  return {
    name: textValue(formData, "name"),
    stage_type: textValue(formData, "stage_type"),
    sequence_number: Number(textValue(formData, "sequence_number")),
    start_at: optionalText(formData, "start_at"),
    end_at: optionalText(formData, "end_at"),
    timezone: optionalText(formData, "timezone"),
    format_text: optionalText(formData, "format_text"),
    best_of_default: optionalNumber(formData, "best_of_default"),
    team_count: optionalNumber(formData, "team_count"),
    is_online:
      textValue(formData, "is_online") === ""
        ? null
        : textValue(formData, "is_online") === "true",
    location_name: optionalText(formData, "location_name"),
    status: textValue(formData, "status"),
    is_public: formData.get("is_public") === "on",
  };
}

function teamValues(formData: FormData) {
  return {
    name: textValue(formData, "name"),
    short_name: optionalText(formData, "short_name"),
    logo_url: optionalText(formData, "logo_url"),
    region: optionalText(formData, "region"),
    seed: optionalNumber(formData, "seed"),
    status: textValue(formData, "status"),
    external_team_id: optionalText(formData, "external_team_id"),
    is_public: formData.get("is_public") === "on",
  };
}

function preservedValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [key, String(value)]),
  );
}

export async function runOperationalMutation(
  entity: OperationalEntity,
  operation: OperationalOperation,
  submissionId: string,
  accessContext: OperationalAccessContext,
  formData: FormData,
): Promise<OperationalActionState> {
  const values = preservedValues(formData);
  try {
    if (entity === "stage" && operation === "create") {
      await createTournamentStage(
        { submissionId, values: stageValues(formData) },
        accessContext,
      );
    } else if (entity === "stage" && operation === "update") {
      await updateTournamentStage(
        {
          submissionId,
          values: {
            ...stageValues(formData),
            id: textValue(formData, "id"),
            expected_updated_at: textValue(formData, "expected_updated_at"),
          },
        },
        accessContext,
      );
    } else if (entity === "stage") {
      await deleteTournamentStage(
        {
          submissionId,
          values: {
            id: textValue(formData, "id"),
            expected_updated_at: textValue(formData, "expected_updated_at"),
          },
        },
        accessContext,
      );
    } else if (operation === "create") {
      await createTournamentTeam(
        { submissionId, values: teamValues(formData) },
        accessContext,
      );
    } else if (operation === "update") {
      await updateTournamentTeam(
        {
          submissionId,
          values: {
            ...teamValues(formData),
            id: textValue(formData, "id"),
            expected_updated_at: textValue(formData, "expected_updated_at"),
          },
        },
        accessContext,
      );
    } else {
      await deleteTournamentTeam(
        {
          submissionId,
          values: {
            id: textValue(formData, "id"),
            expected_updated_at: textValue(formData, "expected_updated_at"),
          },
        },
        accessContext,
      );
    }
    return {
      status: "success",
      message: `${entity === "stage" ? "Stage" : "Team"} ${operation === "delete" ? "deleted" : "saved"}.`,
      fieldErrors: {},
      values: {},
    };
  } catch (error) {
    if (error instanceof OperationalValidationError) {
      return { status: "error", fieldErrors: error.fieldErrors, values };
    }
    if (error instanceof OperationalConflictError) {
      return {
        status: "conflict",
        message:
          "This item was updated elsewhere. Refresh the page and try again.",
        fieldErrors: {},
        values,
      };
    }
    if (error instanceof OperationalDependencyError) {
      return {
        status: "error",
        message:
          error.entity === "stage"
            ? "This stage cannot be deleted because it contains matches."
            : "This team cannot be deleted because it is used by matches or roster members.",
        fieldErrors: {},
        values,
      };
    }
    if (error instanceof OperationalAuthorizationError) {
      return {
        status: "error",
        message: "This workspace link is invalid or no longer available.",
        fieldErrors: {},
        values: {},
      };
    }
    return {
      status: "error",
      message: "We could not save these changes. Please try again.",
      fieldErrors: {},
      values,
    };
  }
}
