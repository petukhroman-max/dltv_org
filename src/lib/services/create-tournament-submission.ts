import "server-only";

import {
  organizerInputSchema,
  tournamentSubmissionInputSchema,
} from "@/lib/domain/submission";
import { toRepositoryError } from "@/lib/repositories/repository-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, TableRow } from "@/lib/supabase/database.types";

type AtomicCreationResult = {
  organizer: TableRow<"organizers">;
  submission: TableRow<"tournament_submissions">;
};

function isAtomicCreationResult(value: Json): value is AtomicCreationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return (
    typeof value.organizer === "object" &&
    value.organizer !== null &&
    typeof value.submission === "object" &&
    value.submission !== null
  );
}

export async function createTournamentSubmissionWithOrganizer(input: {
  organizer: unknown;
  submission: unknown;
  consent: {
    consent_to_publish: true;
    consent_version: "v1";
  };
}): Promise<AtomicCreationResult> {
  const organizer = organizerInputSchema.parse(input.organizer);
  const submission = tournamentSubmissionInputSchema.parse(input.submission);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "create_tournament_submission_with_organizer",
    {
      p_organizer: organizer,
      p_submission: {
        ...submission,
        ...input.consent,
      },
    },
  );

  if (error) {
    throw toRepositoryError(error);
  }
  if (!isAtomicCreationResult(data)) {
    throw toRepositoryError(new Error("Unexpected RPC response"));
  }

  return data;
}
