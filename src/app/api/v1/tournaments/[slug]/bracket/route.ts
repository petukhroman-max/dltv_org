import type { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/public-api/http";
import {
  getApiTournament,
  paginateApiItems,
  toApiMatch,
} from "@/lib/public-api/public-data";
import { handleApiOptions } from "@/lib/public-api/cors";
export async function OPTIONS(request: NextRequest) {
  return handleApiOptions(request);
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return withApiAuth(request, "bracket.read", async () => {
    const slug = (await params).slug;
    const result = paginateApiItems(
      ((await getApiTournament(slug)).brackets ?? []).map((bracket) => ({
        ...bracket,
        matches: bracket.matches.map(toApiMatch),
      })),
      request.nextUrl,
      `bracket:${slug}`,
      (bracket) => bracket.stage.slug,
    );
    return { data: result.items, pagination: result.pagination };
  });
}
