import { z } from "zod";

import { tournamentSubmissionInputSchema } from "@/lib/domain/submission";

export const organizerEditTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid edit link");

export const organizerEditSubmissionSchema = tournamentSubmissionInputSchema
  .safeExtend({
    confirmed: z.literal(true),
  })
  .strict();

export type ParsedOrganizerEditSubmission = z.output<
  typeof organizerEditSubmissionSchema
>;
