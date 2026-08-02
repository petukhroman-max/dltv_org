import type { NextRequest } from "next/server";

import { withApiAuth } from "@/lib/public-api/http";
import {
  getApiTournament,
  toApiTournamentDetails,
} from "@/lib/public-api/public-data";
import { handleApiOptions } from "@/lib/public-api/cors";
export async function OPTIONS(request: NextRequest) {
  return handleApiOptions(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return withApiAuth(request, "tournaments.detail", async () => {
    const projection = await getApiTournament((await params).slug);
    return { data: toApiTournamentDetails(projection) };
  });
}
