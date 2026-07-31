import { z } from "zod";

import {
  organizerInputSchema,
  tournamentSubmissionInputSchema,
} from "@/lib/domain/submission";

export const PUBLIC_SUBMISSION_MIN_FILL_MS = 3_000;
export const PUBLIC_SUBMISSION_MAX_BYTES = 32_768;
export const PUBLIC_SUBMISSION_CONSENT_VERSION = "v1" as const;

export const publicSubmissionSchema = z.object({
  organizer: organizerInputSchema,
  submission: tournamentSubmissionInputSchema,
  consent_to_publish: z.literal(true),
  rendered_at: z.number().int().positive(),
});

export type ParsedPublicSubmission = z.output<typeof publicSubmissionSchema>;
