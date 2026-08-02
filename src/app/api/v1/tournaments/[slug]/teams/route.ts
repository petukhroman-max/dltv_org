import type { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/public-api/http";
import {
  getApiTournament,
  paginateApiItems,
  toApiTeam,
} from "@/lib/public-api/public-data";
import { handleApiOptions } from "@/lib/public-api/cors";
export async function OPTIONS(request: NextRequest) {
  return handleApiOptions(request);
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return withApiAuth(request, "teams.list", async () => {
    const slug = (await params).slug;
    const result = paginateApiItems(
      (await getApiTournament(slug)).teams.map(toApiTeam),
      request.nextUrl,
      `teams:${slug}`,
      (team) => team.slug,
    );
    return { data: result.items, pagination: result.pagination };
  });
}
