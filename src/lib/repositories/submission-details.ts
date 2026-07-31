import "server-only";

import { z } from "zod";

import { getOrganizerById } from "@/lib/repositories/organizers";
import { listSubmissionEvents } from "@/lib/repositories/submission-events";
import { getTournamentSubmissionById } from "@/lib/repositories/tournament-submissions";

export async function getTournamentSubmissionDetails(id: string) {
  const parsedId = z.uuid().parse(id);
  const submission = await getTournamentSubmissionById(parsedId);

  if (!submission) {
    return null;
  }

  const [organizer, events] = await Promise.all([
    getOrganizerById(submission.organizer_id),
    listSubmissionEvents(parsedId),
  ]);

  if (!organizer) {
    return null;
  }

  return {
    submission,
    organizer,
    events,
  };
}
