import "server-only";

import { revalidateTag } from "next/cache";

export const publicTournamentProjectionTag = "public-tournament-projection";

export function revalidatePublicTournamentProjection() {
  revalidateTag(publicTournamentProjectionTag);
}
