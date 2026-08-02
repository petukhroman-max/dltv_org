import type { NextRequest } from "next/server";

import { withApiAuth } from "@/lib/public-api/http";
import { listApiTournaments } from "@/lib/public-api/public-data";
import { handleApiOptions } from "@/lib/public-api/cors";
export async function OPTIONS(request: NextRequest) {
  return handleApiOptions(request);
}

export async function GET(request: NextRequest) {
  return withApiAuth(request, "tournaments.list", async () => {
    const result = await listApiTournaments(request.nextUrl);
    return { data: result.items, pagination: result.pagination };
  });
}
