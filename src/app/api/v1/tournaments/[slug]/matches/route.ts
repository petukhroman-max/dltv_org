import type { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/public-api/http";
import { listApiMatches } from "@/lib/public-api/public-data";
import { handleApiOptions } from "@/lib/public-api/cors";
export async function OPTIONS(request: NextRequest) {
  return handleApiOptions(request);
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return withApiAuth(request, "matches.list", async () => {
    const result = await listApiMatches((await params).slug, request.nextUrl);
    return { data: result.items, pagination: result.pagination };
  });
}
